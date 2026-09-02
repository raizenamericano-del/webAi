"use client";

import { Pricing } from "@/components/landing/pricing";
import { motion } from "framer-motion";
import { HelpCircle as Help } from "lucide-react";

const FAQS = [
  {
    q: "Kuota dihitung gimana?",
    a: "1 request = 1 pesan chat atau 1 gambar yang digenerate. Downloader, converter & utility tools gratis tanpa batas (nggak pakai kuota AI).",
  },
  {
    q: "Admin bisa unlimited?",
    a: "Ya. Akun dengan role ADMIN unlimited request, bisa lihat semua user & log aktivitas di /admin.",
  },
  {
    q: "API key lu punya nggak kepake?",
    a: "Kepake. Groq dipakai buat chat + Whisper transcription, NVIDIA NIM buat image generation. Bisa juga ditambahkan key sendiri di Settings (Bring Your Own Key).",
  },
  {
    q: "Bisa dipasang di HP?",
    a: "Bisa. Neural AI Studio PWA-ready — tinggal 'Add to Home Screen' dari browser HP lu.",
  },
];

export default function PricingPage() {
  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 grid-bg opacity-30" />
      <Pricing />
      <section className="mx-auto max-w-3xl px-5 pb-20">
        <h2 className="mb-6 text-center font-display text-2xl font-black">Pertanyaan yang sering muncul</h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <motion.details
              key={f.q}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group rounded-2xl border border-border bg-card/60 p-4"
            >
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <Help className="h-4 w-4 text-neon-cyan" />
                {f.q}
              </summary>
              <p className="mt-2 pl-6 text-[13px] leading-relaxed text-muted-foreground">{f.a}</p>
            </motion.details>
          ))}
        </div>
      </section>
    </div>
  );
}
