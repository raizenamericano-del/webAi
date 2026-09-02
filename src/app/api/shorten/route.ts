import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail } from "@/lib/store";
import { createShortLink, listShortLinks } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user?.email ? await getUserByEmail(session.user.email) : null;

  const body = await req.json().catch(() => ({}));
  const url = String(body.url || "").trim();
  const custom = String(body.code || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);

  if (!/^https?:\/\//i.test(url)) return NextResponse.json({ error: "URL harus diawali http(s)://" }, { status: 400 });

  try {
    const row: any = await createShortLink(url, user?.id || null, custom || undefined);
    const origin = new URL(req.url).origin;
    return NextResponse.json({ ok: true, code: row.code, shortUrl: `${origin}/s/${row.code}` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Gagal memendekkan URL." }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  const user = session?.user?.email ? await getUserByEmail(session.user.email) : null;
  if (!user) return NextResponse.json({ items: [] });
  return NextResponse.json({ items: await listShortLinks(user.id) });
}
