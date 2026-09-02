import { updateUser } from "./store";
import { NextResponse } from "next/server";

export const PLAN_LIMITS: Record<string, number> = {
  FREE: 100,
  PRO: 10_000,
  ENTERPRISE: Number.POSITIVE_INFINITY,
  ADMIN: Number.POSITIVE_INFINITY,
};

export const PLAN_FEATURES: Record<string, string[]> = {
  FREE: [
    "100 request / hari",
    "AI Chat (LLaMA 3, Mixtral, Gemma)",
    "Image generator SDXL (1 gambar)",
    "Semua downloader sosmed",
    "Semua tools utility (unlimited)",
    "Riwayat 30 aktivitas terakhir",
  ],
  PRO: [
    "10.000 request / hari",
    "Semua model AI + NVIDIA Nemotron 70B",
    "Image generator SD3 / FLUX (batch 4)",
    "Code interpreter + web search",
    "Speech-to-text & text-to-speech",
    "Riwayat & export tanpa batas",
    "API key pribadi (3 key)",
  ],
  ENTERPRISE: [
    "Unlimited request",
    "Semua fitur Pro",
    "Priority inference",
    "Custom model & system prompt",
    "API key tak terbatas",
    "White-label + support langsung",
  ],
};

export function limitFor(plan: string | undefined | null) {
  return PLAN_LIMITS[plan || "FREE"] ?? PLAN_LIMITS.FREE;
}

/** Hitung pemakaian hari ini (auto reset tiap 24 jam). */
export async function currentUsage(user: any) {
  const isAdmin = user?.role === "ADMIN";
  const limit = isAdmin ? PLAN_LIMITS.ADMIN : limitFor(user?.plan);
  if (!user) return { used: 0, limit: PLAN_LIMITS.FREE, remaining: PLAN_LIMITS.FREE, plan: "FREE" };

  const now = Date.now();
  const resetAt = user.requestResetAt ? new Date(user.requestResetAt).getTime() : 0;
  let used = Number(user.dailyRequests || 0);

  if (!resetAt || now - resetAt > 24 * 3600 * 1000) {
    used = 0;
    await updateUser(user.id, { dailyRequests: 0, requestResetAt: new Date().toISOString() });
  }
  const unlimited = limit === Number.POSITIVE_INFINITY;
  return {
    used,
    limit: unlimited ? -1 : limit,
    unlimited,
    plan: isAdmin ? "ADMIN" : user.plan || "FREE",
    remaining: unlimited ? -1 : Math.max(0, limit - used),
  };
}

/**
 * Cek + konsumsi kuota. Balikin NextResponse 429 kalau habis, selain itu null.
 * Admin (role ADMIN) unlimited.
 */
export async function consumeQuota(user: any, amount = 1): Promise<NextResponse | null> {
  if (!user) return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  if (user.role === "ADMIN") {
    await updateUser(user.id, {
      dailyRequests: Number(user.dailyRequests || 0) + amount,
      totalRequests: Number(user.totalRequests || 0) + amount,
    });
    return null;
  }
  const { used, limit } = await currentUsage(user);
  if (used + amount > limit) {
    return NextResponse.json(
      {
        error: `Kuota harian habis (${used}/${limit}). Upgrade ke Pro buat 10.000 request/hari.`,
        code: "QUOTA_EXCEEDED",
        used,
        limit,
      },
      { status: 429 },
    );
  }
  await updateUser(user.id, {
    dailyRequests: used + amount,
    totalRequests: Number(user.totalRequests || 0) + amount,
  });
  return null;
}
