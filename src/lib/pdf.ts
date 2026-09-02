/** Helper PDF server-side. */

let pdfParseCache: any = null;
function getPdfParse() {
  if (!pdfParseCache) {
    // pdf-parse bundling workaround
    pdfParseCache = require("pdf-parse/lib/pdf-parse.js");
  }
  return pdfParseCache;
}

export async function extractPdfText(buf: Buffer): Promise<string> {
  try {
    const pdf = getPdfParse();
    const data = await pdf(buf);
    return data.text || "";
  } catch {
    try {
      const pdf = require("pdf-parse");
      const data = await pdf(buf);
      return data.text || "";
    } catch (e: any) {
      throw new Error("Gagal membaca PDF: " + e.message);
    }
  }
}
