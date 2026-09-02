"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Crown, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";

const PLANS = [
  {
    id: "FREE",
    name: "Free",
    price: "Rp 0",
    period: "selamanya",
    icon: Sparkles,
    features: [
      "100 request / hari",
      "AI Chat (LLaMA 3, Mixtral, Gemma)",
      "Image generator SDXL (1 gambar)",
      "Semua downloader sosial media",
      "20+ utility tools (unlimited)",
      "Riwayat 30 aktivitas",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    price: "Rp 99.000",
    period: "/bulan",
    icon: Crown,
    popular: true,
    features: [
      "10.000 request / hari",
      "Semua model AI + NVIDIA Nemotron 70B",
      "Image generator SD3 & FLUX (batch 4)",
      "Code interpreter + web search",
      "Speech-to-text & text-to-speech",
      "Riwayat & export tanpa batas",
      "3 API key pribadi",
    ],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: "Custom",
    period: "hubungi kami",
    icon: Building2,
    features: [
      "Unlimited request",
      "Priority inference (anti antre)",
      "Custom system prompt & model",
      "API key tak terbatas",
      "White-label + SLA",
      "Support langsung (WA/Telegram)",
    ],
  },
];

export function Pricing() {
  const { info, error } = useToast();
  const [loading, setLoading] = React.useState<string | null>(null);

  const subscribe = async (plan: string) => {
    setLoading(plan);
    try {
      const r = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const j = await r.json();
      if (j.url) {
        window.location.href = j.url;
        return;
      }
      if (j.demo) {
        info("Demo mode", j.message || "Stripe belum dikonfigurasi — upgrade disimulasikan.");
        return;
      }
      error("Gagal", j.error || "Tidak bisa membuat sesi pembayaran.");
    } catch (e: any) {
      error("Gagal", e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <section id="pricing" className="relative mx-auto max-w-6xl px-5 py-20">
      <div className="mb-10 text-center">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-neon-cyan">// harga</span>
        <h2 className="mt-3 font-display text-3xl font-black sm:text-4xl">
          Mulai gratis, upgrade kalau <span className="text-gradient">udah nagih</span>
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">Pembayaran lewat Stripe. Admin/unlimited juga tersedia.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {PLANS.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className={`relative rounded-2xl border p-6 backdrop-blur ${
              p.popular ? "border-primary/60 shadow-[0_0_40px_-12px_hsl(187_100%_50%)]" : "border-border bg-card/60"
            }`}
          >
            {p.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-neon-cyan to-neon-magenta px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-black">
                Paling Laris
              </span>
            )}
            <p.icon className="h-6 w-6 text-neon-cyan" />
            <h3 className="mt-3 font-display text-xl font-bold">{p.name}</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-3xl font-black">{p.price}</span>
              <span className="text-xs text-muted-foreground">{p.period}</span>
            </div>

            <ul className="mt-5 space-y-2.5">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2 text-[13px]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-neon-lime" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>

            <Button
              className="mt-6 w-full"
              variant={p.popular ? "neon" : "outline"}
              onClick={() => (p.id === "ENTERPRISE" ? (window.location.href = "mailto:admin@neuralai.studio") : subscribe(p.id))}
              disabled={loading === p.id}
            >
              {loading === p.id && <Loader2 className="h-4 w-4 animate-spin" />}
              {p.id === "FREE" ? "Pakai Gratis" : p.id === "ENTERPRISE" ? "Hubungi Sales" : "Upgrade ke Pro"}
            </Button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
