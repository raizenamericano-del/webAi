import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail, updateUser } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 401 });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      bio: user.bio,
      image: user.image,
      role: user.role,
      plan: user.plan,
      createdAt: user.createdAt,
    },
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.name === "string") data.name = body.name.slice(0, 80);
  if (typeof body.bio === "string") data.bio = body.bio.slice(0, 400);
  if (typeof body.image === "string") data.image = body.image.slice(0, 500);

  await updateUser(user.id, data);
  return NextResponse.json({ ok: true });
}
