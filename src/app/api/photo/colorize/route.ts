import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail } from "@/lib/store";
import { consumeQuota } from "@/lib/usage";
import { resolveKey } from "@/lib/ai";
import { logActivity } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Colorize foto hitam-putih pakai DeOldify (via Replicate). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 401 });

  const token = await resolveKey(user.id, "replicate", "REPLICATE_API_TOKEN");
  if (!token)
    return NextResponse.json(
      { error: "Colorize butuh REPLICATE_API_TOKEN (Settings → Bring Your Own Key)." },
      { status: 404 },
    );

  const form = await req.formData().catch(() => null);
  const image = form?.get("image") as File | null;
  if (!image) return NextResponse.json({ error: "Tidak ada gambar." }, { status: 400 });

  const quota = await consumeQuota(user, 1);
  if (quota) return quota;

  try {
    const buf = Buffer.from(await image.arrayBuffer());
    const dataUri = `data:${image.type || "image/png"};base64,${buf.toString("base64")}`;

    const r = await fetch("https://api.replicate.com/v1/models/cjwbw/deoldify/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, Prefer: "wait" },
      body: JSON.stringify({ input: { image: dataUri, render_factor: 35 } }),
    });
    const j = await r.json();

    let output = j?.output;
    if (!output && j?.urls?.get) {
      // poll kalau belum selesai
      for (let i = 0; i < 30; i++) {
        await new Promise((res) => setTimeout(res, 2000));
        const p = await fetch(j.urls.get, { headers: { Authorization: `Bearer ${token}` } });
        const pj = await p.json();
        if (pj.status === "succeeded") {
          output = pj.output;
          break;
        }
        if (pj.status === "failed") throw new Error(pj.error || "Prediction failed");
      }
    }
    if (!output) throw new Error("Model belum balikin hasil.");

    const outUrl = Array.isArray(output) ? output[0] : output;
    const imgRes = await fetch(outUrl);
    logActivity(user.id, "colorize", "deoldify", "tools");
    return new NextResponse(imgRes.body as any, {
      headers: { "Content-Type": imgRes.headers.get("content-type") || "image/png" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
