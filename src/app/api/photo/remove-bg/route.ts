import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail } from "@/lib/store";
import { consumeQuota } from "@/lib/usage";
import { resolveKey } from "@/lib/ai";
import { logActivity } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hapus background: remove.bg → clipdrop. Butuh salah satu key. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const image = form?.get("image") as File | null;
  if (!image) return NextResponse.json({ error: "Tidak ada gambar." }, { status: 400 });

  const removebg = await resolveKey(user.id, "removebg", "REMOVEBG_API_KEY");
  const clipdrop = await resolveKey(user.id, "clipdrop", "CLIPDROP_API_KEY");

  if (!removebg && !clipdrop)
    return NextResponse.json({ error: "Tambahkan REMOVEBG_API_KEY atau CLIPDROP_API_KEY (Settings → Bring Your Own Key) buat hasil terbaik." }, { status: 404 });

  const quota = await consumeQuota(user, 1);
  if (quota) return quota;

  try {
    if (removebg) {
      const fd = new FormData();
      fd.append("image_file", image, "image.png");
      fd.append("size", "auto");
      const r = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": removebg },
        body: fd,
      });
      if (r.ok) {
        logActivity(user.id, "remove-bg", "remove.bg", "tools");
        return new NextResponse(r.body as any, { headers: { "Content-Type": "image/png" } });
      }
      const t = await r.text();
      console.warn("[remove.bg]", r.status, t.slice(0, 200));
    }

    if (clipdrop) {
      const fd = new FormData();
      fd.append("image_file", image, "image.png");
      const r = await fetch("https://clipdrop-api.co/remove-background/v1", {
        method: "POST",
        headers: { "x-api-key": clipdrop },
        body: fd,
      });
      if (r.ok) {
        logActivity(user.id, "remove-bg", "clipdrop", "tools");
        return new NextResponse(r.body as any, { headers: { "Content-Type": "image/png" } });
      }
      const t = await r.text();
      throw new Error(`Clipdrop error ${r.status}: ${t.slice(0, 200)}`);
    }

    throw new Error("Gagal menghapus background dari semua provider.");
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
