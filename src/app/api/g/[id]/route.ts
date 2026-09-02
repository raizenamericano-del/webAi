import { NextResponse } from "next/server";
import { dbGet } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Sajikan gambar hasil generate (disimpan sebagai data URL di DB). */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const row: any = await dbGet("SELECT * FROM generations WHERE id = ?", [params.id]);
  const url: string = row?.resultUrl || "";
  const m = url.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) return new NextResponse("Not found", { status: 404 });
  const buf = Buffer.from(m[2], "base64");
  return new NextResponse(buf as any, {
    headers: {
      "Content-Type": m[1] || "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
