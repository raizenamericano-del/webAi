import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail } from "@/lib/store";
import { consumeQuota } from "@/lib/usage";
import { scrapeUrl } from "@/lib/search";
import { SOCIAL_FNS, keywordIdeas, competitorAnalysis } from "@/lib/social";
import { logActivity } from "@/lib/realtime";
import { friendlyError } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** mode: page | social | keywords | competitor */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const mode = String(body.mode || "page");

  // scraping & riset pakai 1 request dari kuota
  const quota = await consumeQuota(user, 1);
  if (quota) return quota;

  try {
    if (mode === "page") {
      const url = String(body.url || "");
      if (!/^https?:\/\//i.test(url)) throw new Error("URL nggak valid.");
      const data = await scrapeUrl(url);
      await logActivity(user.id, "scrape", url.slice(0, 90), "tools");
      return NextResponse.json({ ok: true, data });
    }

    if (mode === "social") {
      const platform = String(body.platform || "");
      const username = String(body.username || "").replace(/^@/, "").trim();
      const fn = SOCIAL_FNS[platform];
      if (!fn) throw new Error("Platform belum didukung: " + platform);
      const data = await fn(username);
      if (!data)
        return NextResponse.json({
          ok: false,
          error: "Data nggak bisa diambil (platform ngasih blok / username salah). Coba lagi nanti.",
        });
      await logActivity(user.id, `social:${platform}`, username, "tools");
      return NextResponse.json({ ok: true, data });
    }

    if (mode === "keywords") {
      const seed = String(body.seed || "").trim();
      if (!seed) throw new Error("Keyword kosong.");
      const data = await keywordIdeas(seed);
      await logActivity(user.id, "keywords", seed, "tools");
      return NextResponse.json({ ok: true, data });
    }

    if (mode === "competitor") {
      const url = String(body.url || "");
      if (!/^https?:\/\//i.test(url)) throw new Error("URL nggak valid.");
      const data = await competitorAnalysis(url);
      await logActivity(user.id, "competitor", url.slice(0, 90), "tools");
      return NextResponse.json({ ok: true, data });
    }

    throw new Error("Mode nggak dikenal.");
  } catch (e: any) {
    return NextResponse.json({ error: friendlyError(e, "Scraping gagal.") }, { status: 422 });
  }
}
