import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createThread, getUserByEmail, listThreads } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ threads: [] });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ threads: [] });
  const threads = await listThreads(user.id);
  return NextResponse.json({ threads });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const thread = await createThread(user.id, body.title || "Percakapan baru", body.model || "llama-3.3-70b-versatile");
  return NextResponse.json({ thread });
}
