/** Ekstrak teks dari file upload (PDF, DOCX, XLSX/CSV, TXT, JSON, kode). */
export async function extractText(file: File, maxChars = 24000): Promise<string> {
  const name = (file.name || "").toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());

  try {
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      const { extractPdfText } = await import("./pdf");
      return clip(await extractPdfText(buf), maxChars);
    }
    if (name.endsWith(".docx") || file.type?.includes("wordprocessingml")) {
      const mammoth = await import("mammoth");
      const r = await mammoth.extractRawText({ buffer: buf });
      return clip(r.value || "", maxChars);
    }
    if (name.endsWith(".xlsx") || name.endsWith(".xls") || file.type?.includes("spreadsheet")) {
      const ExcelJS = await import("exceljs");
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf as any);
      const out: string[] = [];
      wb.eachSheet((ws) => {
        out.push(`### Sheet: ${ws.name}`);
        ws.eachRow((row, i) => {
          if (i > 400) return;
          out.push((row.values as any[]).slice(1).map((v) => String(v ?? "")).join(" | "));
        });
      });
      return clip(out.join("\n"), maxChars);
    }
    if (name.endsWith(".csv")) {
      return clip(buf.toString("utf8"), maxChars);
    }
  } catch (e: any) {
    return `[Gagal mengekstrak ${name}: ${e.message}]`;
  }
  // default: anggap teks
  return clip(buf.toString("utf8"), maxChars);
}

function clip(s: string, n: number) {
  const t = s.replace(/\r/g, "").trim();
  if (t.length <= n) return t;
  return t.slice(0, n) + `\n\n[...dipotong, total ${t.length} karakter]`;
}

export const SUPPORTED_UPLOAD = ".pdf,.docx,.txt,.md,.csv,.xlsx,.xls,.json,.js,.ts,.py,.html,.css,.log";
