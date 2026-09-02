import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail, listActivities, listGenerations, listDownloads } from "@/lib/store";
import { currentUsage } from "@/lib/usage";
import { dbAll } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 401 });

  const usage = await currentUsage(user);
  const [activities, generations, downloads, threads] = await Promise.all([
    listActivities(user.id, 40),
    listGenerations(user.id, undefined, 30),
    listDownloads(user.id, 30),
    dbAll("SELECT COUNT(*) as n FROM chat_threads WHERE userId = ?", [user.id]),
  ]);

  return NextResponse.json({
    usage,
    totals: {
      threads: Number((threads as any[])[0]?.n || 0),
      images: (generations as any[]).filter((g) => g.type === "image").length,
      downloads: (downloads as any[]).length,
      requests: user.totalRequests,
    },
    activities,
    generations,
    downloads,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      bio: user.bio,
      role: user.role,
      plan: user.plan,
      createdAt: user.createdAt,
    },
  });
}
