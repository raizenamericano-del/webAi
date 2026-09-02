import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail, listGenerations } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ items: [] });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ items: [] });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || undefined;

  const rows: any[] = (await listGenerations(user.id, type, 60)) as any[];
  const items = rows.map((r) => ({
    id: r.id,
    url: `/api/g/${r.id}`,
    prompt: r.prompt,
    type: r.type,
    model: safeJson(r.meta)?.model,
    createdAt: r.createdAt,
  }));
  return NextResponse.json({ items });
}

function safeJson(s?: string | null) {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
