import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail, updateUser } from "@/lib/store";

export const dynamic = "force-dynamic";

const PRICE_ENV: Record<string, string> = {
  PRO: "STRIPE_PRICE_PRO",
  ENTERPRISE: "STRIPE_PRICE_ENTERPRISE",
};

/**
 * Bikin sesi checkout Stripe.
 * Kalau Stripe belum dikonfigurasi, balikin mode demo (langsung upgrade plan)
 * supaya flow-nya tetep bisa dicoba tanpa key.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const plan = String(body.plan || "PRO").toUpperCase();
  if (!PRICE_ENV[plan]) return NextResponse.json({ error: "Plan nggak valid." }, { status: 400 });

  const secret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env[PRICE_ENV[plan]];
  const origin = new URL(req.url).origin;

  if (!secret || !priceId) {
    // DEMO MODE
    await updateUser(user.id, { plan } as any);
    return NextResponse.json({
      demo: true,
      plan,
      message: `Stripe belum dikonfigurasi — akun lu sementara di-upgrade ke ${plan} (demo). Isi STRIPE_SECRET_KEY + STRIPE_PRICE_${plan} di .env.local buat billing beneran.`,
    });
  }

  try {
    const params = new URLSearchParams({
      mode: "subscription",
      success_url: `${origin}/dashboard?upgraded=1`,
      cancel_url: `${origin}/pricing`,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      client_reference_id: user.id,
      customer_email: user.email,
    });
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.message || `Stripe error ${r.status}`);
    return NextResponse.json({ url: j.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
