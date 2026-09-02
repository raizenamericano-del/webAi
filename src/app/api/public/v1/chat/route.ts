import { NextResponse } from "next/server";
import { sha256 } from "@/lib/crypto";
import { findApiKey, getUserById, touchApiKey, createThread, addMessage, updateUser } from "@/lib/store";
import { chatOnce, GROQ_MODELS } from "@/lib/ai";
import { currentUsage } from "@/lib/usage";
import { friendlyError } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public API — akses pakai API key pribadi.
 *
 * POST /api/public/v1/chat
 * Headers: Authorization: Bearer na_xxxx
 * Body: { "messages": [{role, content}], "model": "llama-3.3-70b-versatile" }
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token.startsWith("na_")) return NextResponse.json({ error: "API key tidak valid. Format: Bearer na_xxx" }, { status: 401 });

  const keyRow: any = await findApiKey(sha256(token));
  if (!keyRow) return NextResponse.json({ error: "API key tidak ditemukan atau sudah dicabut." }, { status: 401 });

  const user = await getUserById(keyRow.userId);
  if (!user) return NextResponse.json({ error: "User tidak valid." }, { status: 401 });

  const { used, limit, unlimited } = (await currentUsage(user)) as any;
  if (!unlimited && used + 1 > limit)
    return NextResponse.json({ error: "Kuota harian habis.", code: "QUOTA_EXCEEDED" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const messages = (body.messages || []) as { role: string; content: string }[];
  const model = String(body.model || "llama-3.3-70b-versatile");

  if (!messages.length) return NextResponse.json({ error: "messages wajib diisi." }, { status: 400 });

  try {
    const content = await chatOnce({
      messages: messages.map((m) => ({ role: m.role as any, content: m.content })),
      model,
      userId: user.id,
      temperature: body.temperature ?? 0.7,
      maxTokens: body.maxTokens ?? 2048,
    });

    await updateUser(user.id, {
      dailyRequests: used + 1,
      totalRequests: Number(user.totalRequests || 0) + 1,
    });
    await touchApiKey(keyRow.id);

    return NextResponse.json({
      ok: true,
      model,
      choices: [{ message: { role: "assistant", content } }],
      usage: { used: used + 1, limit: limit === Infinity ? "unlimited" : limit },
    });
  } catch (e: any) {
    return NextResponse.json({ error: friendlyError(e, "Gagal memanggil AI.") }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "Neural AI Studio Public API",
    endpoints: {
      chat: { method: "POST", path: "/api/public/v1/chat", body: { messages: [{ role: "user", content: "Halo" }], model: "llama-3.3-70b-versatile" } },
    },
    models: GROQ_MODELS.map((m) => m.id),
    auth: "Authorization: Bearer na_xxxxx (bikin di /dashboard → API Keys)",
    example: `curl ${"{origin}"}/api/public/v1/chat -H "Authorization: Bearer na_xxx" -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Halo"}]}'`,
  });
}
