import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail } from "@/lib/store";
import { consumeQuota } from "@/lib/usage";
import { resolveKey } from "@/lib/ai";
import { addGeneration } from "@/lib/store";
import { logActivity } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * AI Music Generator.
 * Butuh SUNO_API_KEY (atau key user di Settings → provider `suno`).
 * Kalau belum ada, balikin pesan jelas (bukan error 500).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const prompt = String(body.prompt || "").slice(0, 1000);
  if (!prompt) return NextResponse.json({ error: "Prompt kosong." }, { status: 400 });

  const key = await resolveKey(user.id, "suno", "SUNO_API_KEY");
  if (!key) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "AI Music butuh SUNO_API_KEY. Tambahkan di .env.local (SUNO_API_KEY=...) atau di Settings → Bring Your Own Key (provider: suno).",
        hint: "Sementara ini, media tools lain (TTS, STT, trimmer, konverter) tetap jalan tanpa key.",
      },
      { status: 200 },
    );
  }

  const quota = await consumeQuota(user, 1);
  if (quota) return quota;

  try {
    const r = await fetch("https://api.suno.ai/v1/music", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ prompt, make_instrumental: false, wait_audio: true }),
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Suno error ${r.status}: ${t.slice(0, 200)}`);
    }
    const j = await r.json();
    const audioUrl = j?.audio_url || j?.data?.[0]?.audio_url || j?.clip?.audio_url;
    await addGeneration(user.id, "music", prompt, audioUrl, { provider: "suno" });
    logActivity(user.id, "music", prompt.slice(0, 80), "tools");
    return NextResponse.json({ ok: true, audioUrl, raw: j });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 200 });
  }
}
