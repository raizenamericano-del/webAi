import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail } from "@/lib/store";
import { consumeQuota } from "@/lib/usage";
import { generateImage } from "@/lib/ai";
import { addGeneration } from "@/lib/store";
import { logActivity } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Login dulu untuk generate gambar." }, { status: 401 });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    prompt = "",
    negativePrompt = "",
    model = "stabilityai/stable-diffusion-3-medium",
    style = "",
    aspect = "1:1",
    batch = 1,
    steps,
    seed,
    imageBase64,
    maskBase64,
    strength,
  } = body;

  if (!prompt.trim()) return NextResponse.json({ error: "Prompt tidak boleh kosong." }, { status: 400 });

  const count = Math.min(Math.max(Number(batch) || 1, 1), 4);
  const quota = await consumeQuota(user, count);
  if (quota) return quota;

  const [w, h] = aspectSize(String(aspect));
  const styledPrompt = style ? `${prompt}, ${style}` : prompt;

  try {
    const { images, model: used } = await generateImage({
      prompt: styledPrompt,
      negativePrompt,
      model,
      width: w,
      height: h,
      steps: steps ? Number(steps) : undefined,
      seed: seed ? Number(seed) : undefined,
      batch: count,
      imageBase64,
      maskBase64,
      strength: strength ? Number(strength) : undefined,
      userId: user.id,
    });

    const saved = [];
    for (const dataUrl of images) {
      const gen: any = await addGeneration(user.id, "image", styledPrompt, dataUrl, {
        model: used,
        negativePrompt,
        style,
        aspect,
      });
      saved.push({ id: gen.id, url: `/api/g/${gen.id}`, dataUrl });
    }

    logActivity(user.id, "image-generate", styledPrompt.slice(0, 90), "images");
    return NextResponse.json({ ok: true, images: saved, model: used });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Gagal generate gambar." }, { status: 500 });
  }
}

function aspectSize(a: string): [number, number] {
  const map: Record<string, [number, number]> = {
    "1:1": [1024, 1024],
    "4:3": [1152, 896],
    "3:4": [896, 1152],
    "16:9": [1344, 768],
    "9:16": [768, 1344],
    "21:9": [1536, 640],
  };
  return map[a] || [1024, 1024];
}
