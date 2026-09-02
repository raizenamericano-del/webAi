"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  MessageSquareCode,
  ImageIcon,
  DownloadCloud,
  Clapperboard,
  Wand2,
  FileStack,
  Globe,
  Wrench,
  ArrowUpRight,
} from "lucide-react";

export const FEATURES = [
  {
    icon: MessageSquareCode,
    title: "AI Chat Multi-Model",
    desc: "LLaMA 3.3 70B, Mixtral 8x7B, Gemma 2, Nemotron 70B. Upload file, /image di dalam chat, web search & code interpreter.",
    href: "/chat",
    color: "from-neon-cyan/20 to-neon-cyan/0",
    accent: "text-neon-cyan",
  },
  {
    icon: ImageIcon,
    title: "AI Image Generator",
    desc: "NVIDIA NIM: Stable Diffusion 3 / SDXL / FLUX. Negative prompt, style, aspect ratio, batch 1-4, img2img & inpainting.",
    href: "/image",
    color: "from-neon-magenta/20 to-neon-magenta/0",
    accent: "text-neon-magenta",
  },
  {
    icon: DownloadCloud,
    title: "Social Downloader",
    desc: "TikTok (no WM), Instagram, YouTube, X, Facebook, Pinterest, Reddit, Spotify, SoundCloud & CapCut.",
    href: "/downloader",
    color: "from-neon-violet/25 to-neon-violet/0",
    accent: "text-neon-violet",
  },
  {
    icon: Clapperboard,
    title: "Video & Audio AI",
    desc: "Text-to-speech, speech-to-text (Whisper), music generator, voice cloning, trimmer & konverter audio/video.",
    href: "/media",
    color: "from-neon-lime/20 to-neon-lime/0",
    accent: "text-neon-lime",
  },
  {
    icon: Wand2,
    title: "Photo Lab AI",
    desc: "Background remover, enhancer/upscale, colorizer, style transfer, object remover & image extender.",
    href: "/photo",
    color: "from-neon-cyan/20 to-neon-cyan/0",
    accent: "text-neon-cyan",
  },
  {
    icon: FileStack,
    title: "File Converter",
    desc: "PDF merge/split/compress, konversi gambar, video, audio & dokumen. Semua jalan di browser, file nggak dikirim ke server.",
    href: "/converter",
    color: "from-neon-magenta/20 to-neon-magenta/0",
    accent: "text-neon-magenta",
  },
  {
    icon: Globe,
    title: "Web & Data Scraper",
    desc: "Ambil HTML/text/metadata website, analitik sosial media, riset keyword & analisis kompetitor.",
    href: "/scraping",
    color: "from-neon-violet/25 to-neon-violet/0",
    accent: "text-neon-violet",
  },
  {
    icon: Wrench,
    title: "20+ Utility Tools",
    desc: "QR code, URL shortener, password generator, JSON formatter, hash, base64, unit converter & masih banyak lagi.",
    href: "/tools",
    color: "from-neon-lime/20 to-neon-lime/0",
    accent: "text-neon-lime",
  },
];

function Card3D({ f, i }: { f: (typeof FEATURES)[number]; i: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 20 });
  const sy = useSpring(y, { stiffness: 200, damping: 20 });
  const rotateX = useTransform(sy, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(sx, [-0.5, 0.5], ["-10deg", "10deg"]);

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };

  const Icon = f.icon;

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: i * 0.06 }}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className="perspective"
    >
      <Link
        href={f.href}
        className="group relative block h-full overflow-hidden rounded-2xl border border-border bg-card/60 p-5 backdrop-blur transition-colors hover:border-primary/60"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 transition-opacity group-hover:opacity-100`} />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className={`grid h-11 w-11 place-items-center rounded-xl border border-border bg-background/70 ${f.accent}`}>
              <Icon className="h-5 w-5" />
            </span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary" />
          </div>
          <h3 className="mt-4 font-display text-base font-bold">{f.title}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{f.desc}</p>
        </div>
      </Link>
    </motion.div>
  );
}

export function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-6xl px-5 py-20">
      <div className="mb-10 text-center">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-neon-cyan">// fitur utama</span>
        <h2 className="mt-3 font-display text-3xl font-black sm:text-4xl">
          Semua yang lu butuh, <span className="text-gradient">dalam satu dashboard</span>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
          Nggak perlu 20 website berbeda. Semua tool AI & utility udah nyatu di sini, bisa dipakai dari HP juga.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <Card3D key={f.title} f={f} i={i} />
        ))}
      </div>
    </section>
  );
}
