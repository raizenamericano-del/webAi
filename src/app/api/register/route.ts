import { NextResponse } from "next/server";
import { z } from "zod";
import { createUser, getUserByEmail } from "@/lib/store";

const schema = z.object({
  name: z.string().min(2).max(60).optional(),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email tidak valid atau password kurang dari 6 karakter." }, { status: 400 });
    }
    const { email, password, name } = parsed.data;
    const exists = await getUserByEmail(email);
    if (exists) return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });

    const user = await createUser({ email, password, name: name || null });
    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Gagal mendaftar." }, { status: 500 });
  }
}
