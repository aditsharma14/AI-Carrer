const JSZip = require('jszip');
const { PDFParse } = require('pdf-parse');
const aiClient = require('../client/aiClient');
const buildResumeParserPrompt = require('../prompts/resumeParser.v1');
const ApiError = require('../../lib/ApiError');
const logger = require('../../config/logger');

const PDF_MAGIC = Buffer.from('%PDF');
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // .docx files are zip archives

// Magic-byte sniffing, not trusting the declared mimetype/extension — see
// docs/ARCHITECTURE.md §11.4. A renamed file proves nothing about its
// actual content; the first few bytes do.
function detectFileType(buffer) {
  if (buffer.subarray(0, 4).equals(PDF_MAGIC)) return 'pdf';
  if (buffer.subarray(0, 4).equals(ZIP_MAGIC)) return 'docx';
  return 'unknown';
}

// Real extraction: unzip the .docx, read its document XML, strip tags.
async function extractTextFromDocx(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const documentFile = zip.file('word/document.xml');
  // Any zip passes the magic-byte check; only a real .docx has this entry.
  if (!documentFile) throw ApiError.badRequest('Unsupported file type — please upload a PDF or DOCX file');
  const documentXml = await documentFile.async('string');
  return documentXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Below this many characters, a PDF almost certainly has no text layer
// (a scanned image). OCR is not implemented yet, so tell the user plainly
// instead of handing the model an empty resume to hallucinate from.
const MIN_PDF_TEXT_CHARS = 50;

async function extractTextFromPdf(buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const { text } = await parser.getText();
    const cleaned = (text || '').replace(/\s+/g, ' ').trim();
    if (cleaned.length < MIN_PDF_TEXT_CHARS) {
      logger.warn('resumeParser: PDF has little or no text layer (likely scanned)', { chars: cleaned.length });
      throw ApiError.badRequest(
        'This PDF looks like a scanned image with no selectable text. Please upload a text-based PDF or a DOCX file.'
      );
    }
    return cleaned;
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function extractText(buffer) {
  const fileType = detectFileType(buffer);
  if (fileType === 'docx') return extractTextFromDocx(buffer);
  if (fileType === 'pdf') return extractTextFromPdf(buffer);
  throw ApiError.badRequest('Unsupported file type — please upload a PDF or DOCX file');
}

// Stub-mode fallback: a lightweight keyword-based "structuring" used only
// while AI_PROVIDER=stub, so the full parse -> structure -> save pipeline is
// demonstrable end-to-end without a real model. A real provider call (via
// the prompt above) replaces this entirely once AI_PROVIDER is switched.
const KNOWN_SKILLS = [
  'javascript', 'typescript', 'react', 'node.js', 'node', 'express', 'mongodb', 'sql', 'python',
  'java', 'aws', 'docker', 'kubernetes', 'graphql', 'css', 'html', 'redux', 'next.js', 'vue',
  'angular', 'c++', 'c#', 'go', 'rust', 'figma', 'project management', 'leadership',
];

function heuristicStructure(rawText) {
  const lower = rawText.toLowerCase();
  return {
    summary: rawText.slice(0, 280).trim(),
    skills: KNOWN_SKILLS.filter((skill) => lower.includes(skill)),
    experience: [],
    education: [],
  };
}

async function parseResume({ fileBuffer }) {
  const rawText = await extractText(fileBuffer);

  const structuredData = await aiClient.complete({
    promptVersion: 'resumeParser.v1',
    messages: buildResumeParserPrompt(rawText),
    mock: () => heuristicStructure(rawText),
  });

  return { rawText, structuredData };
}

module.exports = { parseResume };
