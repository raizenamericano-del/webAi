import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail } from "@/lib/store";
import { consumeQuota } from "@/lib/usage";
import { download, detectPlatform } from "@/lib/downloader";
import { addDownload } from "@/lib/store";
import { logActivity } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user?.email ? await getUserByEmail(session.user.email) : null;

  const body = await req.json().catch(() => ({}));
  const url = String(body.url || "").trim();
  const platform = String(body.platform || "auto");

  if (!url) return NextResponse.json({ error: "URL kosong." }, { status: 400 });

  // downloader gratis & unlimited (nggak pakai kuota AI) — cuma dicatat historinya
  try {
    const result = await download(url, platform);
    if (user) {
      await addDownload(user.id, result.platform, url, result.title, { medias: result.medias.length });
      logActivity(user.id, `download:${result.platform}`, (result.title || url).slice(0, 90), "downloads");
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Gagal mengambil media." }, { status: 422 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "";
  if (!url) return NextResponse.json({ error: "Parameter ?url= wajib diisi." }, { status: 400 });
  try {
    const result = await download(url, searchParams.get("platform") || "auto");
    return NextResponse.json({ ok: true, platform: detectPlatform(url), ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Gagal mengambil media." }, { status: 422 });
  }
}
