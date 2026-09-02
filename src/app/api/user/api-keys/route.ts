import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail, createApiKey, listApiKeys, revokeApiKey } from "@/lib/store";
import { sha256, randomToken } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ keys: [] });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ keys: [] });
  const keys = (await listApiKeys(user.id)) as any[];
  return NextResponse.json({ keys: keys.map((k) => ({ ...k, keyHash: undefined })) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "API Key").slice(0, 40);

  const token = "na_" + randomToken(28);
  const prefix = token.slice(0, 11);
  const row = await createApiKey(user.id, name, sha256(token), prefix);

  // token plaintext cuma dikasih sekali di sini
  return NextResponse.json({ ok: true, token, key: { id: (row as any).id, name, prefix } });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") || "");
  if (id) await revokeApiKey(id, user.id);
  return NextResponse.json({ ok: true });
}
