import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserByEmail, listUsers, listActivities, countUsers } from "@/lib/store";
import { dbAll } from "@/lib/db";
import { getStats } from "@/lib/realtime";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await getUserByEmail(session.user.email);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Akses ditolak. Admin only." }, { status: 403 });

  const [users, activities, downloads, generations, messages, threads] = await Promise.all([
    listUsers(200),
    listActivities(undefined, 60),
    dbAll("SELECT * FROM downloads ORDER BY createdAt DESC LIMIT 30"),
    dbAll("SELECT * FROM generations ORDER BY createdAt DESC LIMIT 30"),
    dbAll("SELECT COUNT(*) as n FROM chat_messages"),
    dbAll("SELECT COUNT(*) as n FROM chat_threads"),
  ]);

  return NextResponse.json({
    ok: true,
    stats: getStats(),
    counts: {
      users: await countUsers(),
      threads: Number((threads as any[])[0]?.n || 0),
      messages: Number((messages as any[])[0]?.n || 0),
      downloads: (downloads as any[]).length,
      generations: (generations as any[]).length,
    },
    users: (users as any[]).map((u) => ({ ...u, passwordHash: undefined })),
    activities,
    downloads,
    generations,
  });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { userId, plan, role } = body;
  if (!userId) return NextResponse.json({ error: "userId wajib." }, { status: 400 });

  const data: any = {};
  if (plan) data.plan = String(plan).toUpperCase();
  if (role) data.role = String(role).toUpperCase();
  if (!Object.keys(data).length) return NextResponse.json({ error: "Nggak ada perubahan." }, { status: 400 });

  await dbAll("UPDATE users SET " + Object.keys(data).map((k) => `${k} = ?`).join(",") + " WHERE id = ?", [
    ...Object.values(data),
    userId,
  ]);
  return NextResponse.json({ ok: true });
}
