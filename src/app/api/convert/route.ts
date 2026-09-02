import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail } from "@/lib/store";
import { logActivity } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Konversi dokumen server-side.
 * mode: pdf-text | pdf-docx | docx-pdf | xlsx-csv | csv-xlsx | xlsx-pdf | docx-text
 */
export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user?.email ? await getUserByEmail(session.user.email) : null;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file") as File | null;
  const mode = String(form?.get("mode") || "");
  if (!file) return NextResponse.json({ error: "Tidak ada file." }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());

  try {
    switch (mode) {
      /* ------------------------------ PDF ------------------------------ */
      case "pdf-text": {
        const { extractPdfText } = await import("@/lib/pdf");
        const text = await extractPdfText(buf);
        return textRes(text, file.name.replace(/\.pdf$/i, "") + ".txt");
      }

      case "pdf-docx": {
        const { extractPdfText } = await import("@/lib/pdf");
        const text = await extractPdfText(buf);
        const docx = await import("docx");
        const { Document, Packer, Paragraph, TextRun } = docx as any;
        const doc = new Document({
          sections: [
            {
              children: text
                .split(/\n{2,}/)
                .map((p: string) => new Paragraph({ children: [new TextRun(p.replace(/\n/g, " "))] })),
            },
          ],
        });
        const out = await Packer.toBuffer(doc);
        log(user, "pdf-docx", file.name);
        return binRes(out, file.name.replace(/\.pdf$/i, "") + ".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      }

      case "docx-text":
      case "docx-pdf": {
        const mammoth = await import("mammoth");
        const { value } = await mammoth.extractRawText({ buffer: buf });
        if (mode === "docx-text") return textRes(value || "", file.name.replace(/\.docx$/i, "") + ".txt");

        const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
        const pdf = await PDFDocument.create();
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        const size = 11;
        const margin = 48;
        let page = pdf.addPage([595, 842]);
        let y = 842 - margin;
        for (const rawLine of (value || "").split("\n")) {
          const words = rawLine.split(/\s+/);
          let line = "";
          for (const w of words) {
            const test = line ? line + " " + w : w;
            if (font.widthOfTextAtSize(test, size) > 595 - margin * 2) {
              if (y < margin + 20) {
                page = pdf.addPage([595, 842]);
                y = 842 - margin;
              }
              page.drawText(line, { x: margin, y, size, font, color: rgb(0, 0, 0) });
              y -= size + 5;
              line = w;
            } else line = test;
          }
          if (line) {
            if (y < margin + 20) {
              page = pdf.addPage([595, 842]);
              y = 842 - margin;
            }
            page.drawText(line, { x: margin, y, size, font, color: rgb(0, 0, 0) });
            y -= size + 5;
          }
        }
        const bytes = await pdf.save();
        log(user, "docx-pdf", file.name);
        return binRes(Buffer.from(bytes), file.name.replace(/\.docx$/i, "") + ".pdf", "application/pdf");
      }

      /* ----------------------------- EXCEL ----------------------------- */
      case "xlsx-csv": {
        const ExcelJS = await import("exceljs");
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf as any);
        const rows: string[][] = [];
        wb.eachSheet((ws) => {
          rows.push([`### ${ws.name}`]);
          ws.eachRow((row) => rows.push((row.values as any[]).slice(1).map((v) => String(v ?? ""))));
        });
        const csv = rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
        return textRes(csv, file.name.replace(/\.(xlsx|xls)$/i, "") + ".csv", "text/csv");
      }

      case "csv-xlsx": {
        const ExcelJS = await import("exceljs");
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("Sheet1");
        const text = buf.toString("utf8");
        text.split(/\r?\n/).forEach((line) => {
          if (!line.trim()) return;
          ws.addRow(splitCsv(line));
        });
        const out = await wb.xlsx.writeBuffer();
        log(user, "csv-xlsx", file.name);
        return binRes(
          Buffer.from(out as ArrayBuffer),
          file.name.replace(/\.csv$/i, "") + ".xlsx",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
      }

      case "xlsx-pdf": {
        const ExcelJS = await import("exceljs");
        const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf as any);
        const pdf = await PDFDocument.create();
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        const size = 8;
        let page = pdf.addPage([842, 595]); // landscape
        let y = 595 - 40;
        wb.eachSheet((ws) => {
          ws.eachRow((row) => {
            const cells = (row.values as any[]).slice(1).map((v) => String(v ?? ""));
            if (y < 40) {
              page = pdf.addPage([842, 595]);
              y = 595 - 40;
            }
            let x = 30;
            cells.slice(0, 10).forEach((c) => {
              page.drawText(c.slice(0, 24), { x, y, size, font, color: rgb(0, 0, 0) });
              x += 80;
            });
            y -= size + 4;
          });
        });
        const bytes = await pdf.save();
        log(user, "xlsx-pdf", file.name);
        return binRes(Buffer.from(bytes), file.name.replace(/\.(xlsx|xls)$/i, "") + ".pdf", "application/pdf");
      }

      default:
        return NextResponse.json({ error: `Mode konversi nggak dikenal: ${mode}` }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Konversi gagal." }, { status: 500 });
  }
}

async function log(user: any, action: string, name: string) {
  try {
    if (user) await logActivity(user.id, "convert:" + action, name, "tools");
  } catch {}
}

function textRes(text: string, filename: string, mime = "text/plain") {
  return new NextResponse(text, {
    headers: {
      "Content-Type": mime + "; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
    },
  });
}

function binRes(buf: Buffer, filename: string, mime: string) {
  return new NextResponse(buf as any, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
    },
  });
}

function escapeCsv(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function splitCsv(line: string) {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}
