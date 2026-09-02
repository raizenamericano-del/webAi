import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail, listDownloads, listActivities, listGenerations } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ items: [] });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ items: [] });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "activity";
  const limit = Number(searchParams.get("limit") || 50);

  if (type === "downloads") return NextResponse.json({ items: await listDownloads(user.id, limit) });
  if (type === "generations") return NextResponse.json({ items: await listGenerations(user.id, undefined, limit) });
  return NextResponse.json({ items: await listActivities(user.id, limit) });
}
