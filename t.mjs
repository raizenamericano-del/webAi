import fs from 'fs';
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
async function extract(file) {
  const data = new Uint8Array(fs.readFileSync(file));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;
  let out = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const txt = await page.getTextContent();
    out += txt.items.map((it) => it.str).join(' ') + '\n';
  }
  return out;
}
console.log('test.pdf =>', JSON.stringify(await extract('/tmp/test.pdf')));
console.log('test2.pdf =>', JSON.stringify(await extract('/tmp/test2.pdf')));
