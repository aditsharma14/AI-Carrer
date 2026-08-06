const JSZip = require('jszip');
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
  const documentXml = await zip.file('word/document.xml').async('string');
  return documentXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Honest limitation, not a fake implementation: no PDF parsing library
// (e.g. pdf-parse) is in this project's dependencies, and this pass was
// scoped to not add new packages. A from-scratch PDF text extractor is
// exactly the kind of fragile code that shouldn't be written without a
// maintained library behind it — so this returns a clear placeholder and
// logs the gap instead of pretending PDFs are supported.
async function extractTextFromPdf() {
  logger.warn('resumeParser: PDF text extraction is not implemented — add a library like pdf-parse to enable it');
  return '[PDF text extraction not yet implemented for this resume]';
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
