import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import JSZip from 'jszip';

const require = createRequire(import.meta.url);
const { parseResume } = require('../src/ai/services/resumeParser.service');

// Smallest valid single-page PDF with a real text layer, offsets computed
// so the xref table is correct.
function buildPdf(text) {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
}

describe('parseResume', () => {
  it('extracts text from a text-based PDF', async () => {
    const pdf = buildPdf('Jane Doe - Senior Software Engineer - React, Node.js, Docker, AWS - 6 years');
    const { rawText, structuredData } = await parseResume({ fileBuffer: pdf });
    expect(rawText).toContain('Senior Software Engineer');
    expect(structuredData.skills).toEqual(expect.arrayContaining(['react', 'docker', 'aws']));
  });

  it('rejects a PDF with no text layer', async () => {
    await expect(parseResume({ fileBuffer: buildPdf('') })).rejects.toMatchObject({
      message: expect.stringContaining('scanned'),
    });
  });

  it('extracts text from a DOCX', async () => {
    const zip = new JSZip();
    zip.file('word/document.xml', '<w:document><w:body><w:p><w:t>Python and SQL analyst</w:t></w:p></w:body></w:document>');
    const docx = await zip.generateAsync({ type: 'nodebuffer' });
    const { rawText } = await parseResume({ fileBuffer: docx });
    expect(rawText).toBe('Python and SQL analyst');
  });

  it('rejects a zip that is not a DOCX', async () => {
    const zip = new JSZip();
    zip.file('hello.txt', 'hi');
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    await expect(parseResume({ fileBuffer: buffer })).rejects.toMatchObject({
      message: expect.stringContaining('Unsupported file type'),
    });
  });
});
