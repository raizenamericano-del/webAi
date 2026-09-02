import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteThread, getThread, getUserByEmail, listMessages, updateThread, addMessage } from "@/lib/store";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

async function requireUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return getUserByEmail(session.user.email);
}

export async function GET(req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const thread = await getThread(params.id, user.id);
  if (!thread) return NextResponse.json({ error: "Thread tidak ditemukan." }, { status: 404 });
  const messages = await listMessages(thread.id);
  return NextResponse.json({ thread, messages });
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  await updateThread(params.id, {
    ...(body.title ? { title: body.title } : {}),
    ...(body.model ? { model: body.model } : {}),
    ...(body.pinned !== undefined ? { pinned: body.pinned ? 1 : 0 } : {}),
  } as any);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  await deleteThread(params.id);
  return NextResponse.json({ ok: true });
}

/** POST = kirim pesan ke thread ini tanpa streaming (dipakai API key / mobile sederhana). */
export async function POST(req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.content) return NextResponse.json({ error: "Konten kosong." }, { status: 400 });

  const thread = await getThread(params.id, user.id);
  if (!thread) return NextResponse.json({ error: "Thread tidak ditemukan." }, { status: 404 });

  await addMessage(thread.id, body.role || "user", body.content, user.id, thread.model);
  return NextResponse.json({ ok: true });
}
