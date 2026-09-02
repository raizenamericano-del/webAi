"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRealtime } from "@/components/realtime-provider";
import { formatNumber } from "@/lib/utils";

const ParticleField = dynamic(() => import("./particle-field"), { ssr: false });

const WORDS = ["chat dengan AI", "generate gambar cinematic", "download video tanpa watermark", "convert file apapun", "scrape data publik"];

function TypingEffect() {
  const [idx, setIdx] = React.useState(0);
  const [text, setText] = React.useState("");
  const [del, setDel] = React.useState(false);

  React.useEffect(() => {
    const word = WORDS[idx % WORDS.length];
    const speed = del ? 32 : 62;
    const t = setTimeout(() => {
      if (!del) {
        setText(word.slice(0, text.length + 1));
        if (text.length + 1 === word.length) setTimeout(() => setDel(true), 1400);
      } else {
        setText(word.slice(0, text.length - 1));
        if (text.length - 1 === 0) {
          setDel(false);
          setIdx((i) => i + 1);
        }
      }
    }, speed);
    return () => clearTimeout(t);
  }, [text, del, idx]);

  return (
    <span>
      {text}
      <span className="ml-0.5 inline-block h-[1em] w-[3px] translate-y-[2px] animate-pulse bg-neon-cyan" />
    </span>
  );
}

function GlitchText({ children }: { children: string }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10">{children}</span>
      <span
        aria-hidden
        className="absolute left-0 top-0 animate-glitch text-neon-cyan opacity-70 mix-blend-screen"
        style={{ clipPath: "inset(0 0 55% 0)" }}
      >
        {children}
      </span>
      <span
        aria-hidden
        className="absolute left-0 top-0 animate-glitch text-neon-magenta opacity-70 mix-blend-screen"
        style={{ animationDelay: ".4s", clipPath: "inset(55% 0 0 0)" }}
      >
        {children}
      </span>
    </span>
  );
}

export function Hero() {
  const { stats, connected } = useRealtime();

  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <ParticleField className="h-full w-full" />
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />
      </div>

      <div className="mx-auto flex min-h-[86vh] max-w-6xl flex-col items-center justify-center px-5 py-20 text-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-medium text-neon-cyan">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-cyan opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-cyan" />
            </span>
            {connected ? "LIVE · realtime connected" : "Powered by Groq LLaMA 3 + NVIDIA NIM"}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="mt-6 font-display text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
        >
          <GlitchText>NEURAL AI STUDIO</GlitchText>
          <br />
          <span className="text-gradient">20+ AI Tools</span> Dalam Satu Website
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-6 max-w-2xl text-sm text-muted-foreground sm:text-base"
        >
          Chat multi-model (LLaMA 3, Mixtral, Gemma, Nemotron), generate gambar pakai NVIDIA NIM (SD3/FLUX),
          downloader TikTok • Instagram • YouTube • X • Facebook • Spotify, photo lab, converter, scraper & 20+ utility —
          semua gratis dicoba.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Link href="/register">
            <Button size="lg" variant="neon" className="gap-2">
              <Sparkles className="h-4 w-4" /> Start Building
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline" className="gap-2">
              Explore Features <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 font-mono text-xs text-muted-foreground sm:text-sm"
        >
          <span className="text-neon-cyan">{">"}</span> bisa dipakai untuk{" "}
          <span className="text-neon-magenta"><TypingEffect /></span>
        </motion.div>

        {/* Live stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-12 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            { label: "Total Chat", value: stats?.chats, icon: Zap },
            { label: "Gambar Dibuat", value: stats?.images, icon: Sparkles },
            { label: "Media Download", value: stats?.downloads, icon: ArrowRight },
            { label: "User Online", value: stats?.online, icon: Crown, live: true },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-3">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                {s.label}
                {s.live && connected && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-lime" />}
              </div>
              <div className="mt-1 font-display text-xl font-bold text-neon-cyan">
                {s.value !== undefined ? formatNumber(s.value) : "—"}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
