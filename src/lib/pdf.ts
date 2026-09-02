/** Ekstrak teks dari PDF (pdfjs-dist legacy build — jalan di Node tanpa native dep). */

/** Buffer (Node) adalah subclass Uint8Array tapi ditolak pdfjs — salin ke Uint8Array murni. */
export function toUint8Array(buffer: Buffer | Uint8Array | ArrayBuffer): Uint8Array {
  if (buffer instanceof Uint8Array) return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return new Uint8Array(buffer as ArrayBufferLike);
}

export async function extractPdfText(buffer: Buffer | Uint8Array): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = toUint8Array(buffer);
  const doc = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise;

  let out = "";
  const maxPages = Math.min(doc.numPages, 200);
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    for (const item of content.items as any[]) {
      if (!("str" in item)) continue;
      // sisipkan newline kalau pindah baris
      if (lastY !== null && Math.abs((item.transform?.[5] ?? 0) - lastY) > 3) out += "\n";
      out += item.str;
      lastY = item.transform?.[5] ?? null;
    }
    out += "\n";
  }
  try {
    await doc.destroy();
  } catch {}
  return out.trim();
}

export async function countPdfPages(buffer: Buffer | Uint8Array): Promise<number> {
  try {
    const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = toUint8Array(buffer);
    const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
    const n = doc.numPages;
    await doc.destroy();
    return n;
  } catch {
    return 0;
  }
}
