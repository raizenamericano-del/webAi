import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail } from "@/lib/store";
import { consumeQuota } from "@/lib/usage";
import { transcribeAudio } from "@/lib/ai";
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

  const form = await req.formData().catch(() => null);
  const file = form?.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Tidak ada file audio." }, { status: 400 });

  try {
    const text = await transcribeAudio(file, user.id);
    logActivity(user.id, "transcribe", `${file.name} → ${text.slice(0, 60)}`, "tools");
    return NextResponse.json({ ok: true, text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Gagal transkrip audio." }, { status: 500 });
  }
}
