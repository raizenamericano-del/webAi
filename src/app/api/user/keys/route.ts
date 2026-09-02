import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail, setUserKey, listUserKeys, deleteUserKey } from "@/lib/store";
import { encrypt } from "@/lib/crypto";

export const dynamic = "force-dynamic";

/** "Bring Your Own Key": user bisa simpan API key sendiri (terenkripsi). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ keys: [] });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ keys: [] });
  return NextResponse.json({ keys: await listUserKeys(user.id) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const provider = String(body.provider || "").toLowerCase();
  const secret = String(body.secret || "").trim();
  if (!provider || !secret) return NextResponse.json({ error: "Provider & key wajib diisi." }, { status: 400 });

  await setUserKey(user.id, provider, encrypt(secret));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const provider = String(searchParams.get("provider") || "");
  if (provider) await deleteUserKey(user.id, provider);
  return NextResponse.json({ ok: true });
}
