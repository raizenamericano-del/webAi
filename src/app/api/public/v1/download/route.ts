import { NextResponse } from "next/server";
import { sha256 } from "@/lib/crypto";
import { findApiKey, getUserById, touchApiKey, addDownload } from "@/lib/store";
import { download } from "@/lib/downloader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/public/v1/download  { url, platform? }  — butuh API key. */
export async function POST(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token.startsWith("na_")) return NextResponse.json({ error: "API key tidak valid." }, { status: 401 });

  const keyRow: any = await findApiKey(sha256(token));
  if (!keyRow) return NextResponse.json({ error: "API key tidak ditemukan." }, { status: 401 });
  const user = await getUserById(keyRow.userId);
  if (!user) return NextResponse.json({ error: "User tidak valid." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const url = String(body.url || "");
  if (!url) return NextResponse.json({ error: "url wajib diisi." }, { status: 400 });

  try {
    const result = await download(url, body.platform);
    await addDownload(user.id, result.platform, url, result.title, { via: "api" });
    await touchApiKey(keyRow.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 422 });
  }
}
