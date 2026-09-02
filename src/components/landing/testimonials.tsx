"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";

const ITEMS = [
  {
    name: "Rizky Pratama",
    role: "Content Creator · 1.2M followers",
    text: "Gila sih, downloader TikTok tanpa watermark + AI image generator jalan dalam satu tab. Workflow bikin konten naik 3x lipat.",
    rating: 5,
  },
  {
    name: "Nadia Salsabila",
    role: "Founder @Digital Agency",
    text: "Chat-nya ngebut banget pakai LLaMA 3 70B. Fitur upload PDF terus disuruh ringkas itu penyelidikan kompetitor jadi 10 menit.",
    rating: 5,
  },
  {
    name: "Bagas Nurwanto",
    role: "Fullstack Developer",
    text: "Code interpreter + JSON formatter + hash generator... semua tool dev yang gue butuh ada. UI-nya juga gelap & enak di mata.",
    rating: 5,
  },
  {
    name: "Sekar Ayu",
    role: "Mahasiswa & Freelancer",
    text: "Gratis 100 request sehari udah lebih dari cukup buat ngerjain tugas. Converter PDF-nya nggak perlu upload ke server, aman.",
    rating: 5,
  },
];

export function Testimonials() {
  const [i, setI] = React.useState(0);
  const [dir, setDir] = React.useState(1);

  React.useEffect(() => {
    const t = setInterval(() => {
      setDir(1);
      setI((v) => (v + 1) % ITEMS.length);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  const go = (d: number) => {
    setDir(d);
    setI((v) => (v + d + ITEMS.length) % ITEMS.length);
  };

  const item = ITEMS[i];

  return (
    <section className="relative mx-auto max-w-5xl px-5 py-16">
      <div className="mb-8 text-center">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-neon-magenta">// testimoni</span>
        <h2 className="mt-3 font-display text-3xl font-black">Dipakai ribuan kreator</h2>
      </div>

      <div className="relative mx-auto max-w-3xl">
        <div className="glass relative overflow-hidden rounded-3xl p-8 sm:p-10">
          <Quote className="absolute right-6 top-6 h-16 w-16 text-primary/10" />
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={i}
              custom={dir}
              initial={{ opacity: 0, x: dir * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -60 }}
              transition={{ duration: 0.35 }}
            >
              <div className="flex gap-1">
                {Array.from({ length: item.rating }).map((_, k) => (
                  <Star key={k} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mt-4 text-base leading-relaxed sm:text-lg">&ldquo;{item.text}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-neon-cyan to-neon-magenta text-sm font-bold text-black">
                  {item.name.slice(0, 2)}
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.role}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <button onClick={() => go(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-border hover:border-primary">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1.5">
            {ITEMS.map((_, k) => (
              <button
                key={k}
                onClick={() => setI(k)}
                className={`h-1.5 rounded-full transition-all ${k === i ? "w-6 bg-neon-cyan" : "w-1.5 bg-border"}`}
              />
            ))}
          </div>
          <button onClick={() => go(1)} className="grid h-9 w-9 place-items-center rounded-full border border-border hover:border-primary">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
