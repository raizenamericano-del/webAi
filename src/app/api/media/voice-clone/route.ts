import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail } from "@/lib/store";
import { resolveKey } from "@/lib/ai";
import { logActivity } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Voice cloning pakai ElevenLabs Instant Voice Cloning. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 401 });

  const key = await resolveKey(user.id, "elevenlabs", "ELEVENLABS_API_KEY");
  if (!key)
    return NextResponse.json({
      ok: false,
      error: "Voice cloning butuh ELEVENLABS_API_KEY. Set di .env.local atau Settings → Bring Your Own Key.",
    });

  const form = await req.formData().catch(() => null);
  const files = (form?.getAll("files") || []) as File[];
  const name = String(form?.get("name") || "Cloned voice");
  if (!files.length) return NextResponse.json({ ok: false, error: "Upload minimal 1 file audio." });

  const fd = new FormData();
  fd.append("name", name);
  files.slice(0, 5).forEach((f) => fd.append("files", f, f.name));

  try {
    const r = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": key },
      body: fd,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.detail?.message || `ElevenLabs error ${r.status}`);
    logActivity(user.id, "voice-clone", name, "tools");
    return NextResponse.json({ ok: true, voiceId: j.voice_id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message });
  }
}
