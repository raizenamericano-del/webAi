import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail } from "@/lib/store";
import { consumeQuota } from "@/lib/usage";
import { textToSpeech } from "@/lib/ai";
import { logActivity } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 401 });

  const quota = await consumeQuota(user, 1);
  if (quota) return quota;

  const body = await req.json().catch(() => ({}));
  const text = String(body.text || "").slice(0, 4000);
  if (!text) return NextResponse.json({ error: "Teks kosong." }, { status: 400 });

  try {
    const r = await textToSpeech(text, body.voiceId || "21m00Tcm4TlvDq8ikWAM", user.id);
    logActivity(user.id, "tts", text.slice(0, 60), "tools");
    return new NextResponse(r.body as any, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Gagal generate suara." }, { status: 400 });
  }
}
