import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractText } from "@/lib/files";
import { getUserByEmail } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Tidak ada file." }, { status: 400 });

  const text = await extractText(file);
  return NextResponse.json({
    ok: true,
    name: file.name,
    size: file.size,
    chars: text.length,
    text,
  });
}
