import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail } from "@/lib/store";
import { consumeQuota } from "@/lib/usage";
import { resolveKey } from "@/lib/ai";
import { addGeneration } from "@/lib/store";
import { logActivity } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** AI Video Generator — RunwayML (Gen-3) atau Pika. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const prompt = String(body.prompt || "").slice(0, 1000);
  if (!prompt) return NextResponse.json({ error: "Prompt kosong." }, { status: 400 });

  const runway = await resolveKey(user.id, "runway", "RUNWAY_API_KEY");
  const pika = await resolveKey(user.id, "pika", "PIKA_API_KEY");

  if (!runway && !pika) {
    return NextResponse.json({
      ok: false,
      error:
        "AI Video butuh RUNWAY_API_KEY atau PIKA_API_KEY. Set di .env.local atau Settings → Bring Your Own Key.",
      hint: "Alternatif gratis: pakai tab Video Trimmer buat olah video yang udah ada.",
    });
  }

  const quota = await consumeQuota(user, 1);
  if (quota) return quota;

  try {
    if (runway) {
      const r = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${runway}`,
          "X-Runway-Version": "2024-11-06",
        },
        body: JSON.stringify({ model: "gen3a_turbo", promptText: prompt, duration: 5, ratio: "1280:768" }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(`Runway error ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
      await addGeneration(user.id, "video", prompt, undefined, { provider: "runway", id: j.id });
      logActivity(user.id, "video", prompt.slice(0, 80), "tools");
      return NextResponse.json({ ok: true, jobId: j.id, provider: "runway", status: j.status || "PENDING" });
    }

    const r = await fetch("https://api.pika.art/v1/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${pika}` },
      body: JSON.stringify({ promptText: prompt }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Pika error ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
    await addGeneration(user.id, "video", prompt, undefined, { provider: "pika", id: j.job_id });
    logActivity(user.id, "video", prompt.slice(0, 80), "tools");
    return NextResponse.json({ ok: true, jobId: j.job_id, provider: "pika" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 200 });
  }
}
