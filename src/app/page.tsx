import Link from "next/link";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Testimonials } from "@/components/landing/testimonials";
import { Pricing } from "@/components/landing/pricing";
import { Button } from "@/components/ui/button";
import { ArrowRight, Github, Terminal } from "lucide-react";

const MARQUEE = [
  "AI Chat Multi-Model",
  "NVIDIA NIM Image Gen",
  "TikTok Downloader",
  "Instagram Downloader",
  "YouTube MP3/MP4",
  "X / Twitter Downloader",
  "Spotify Downloader",
  "PDF Tools",
  "Background Remover",
  "Text-to-Speech",
  "Speech-to-Text",
  "QR Generator",
  "Web Scraper",
  "JSON Formatter",
  "Unit Converter",
];

export default function LandingPage() {
  return (
    <>
      <Hero />

      <div className="relative overflow-hidden border-y border-border bg-secondary/30 py-3">
        <div className="flex w-max animate-[marquee_38s_linear_infinite] gap-8 whitespace-nowrap">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={i} className="flex items-center gap-8 font-mono text-xs text-muted-foreground">
              {m} <span className="text-neon-cyan">✦</span>
            </span>
          ))}
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
      </div>

      <Features />
      <Testimonials />
      <Pricing />

      {/* CTA */}
      <section className="relative mx-auto max-w-5xl px-5 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-10 text-center">
          <div className="absolute inset-0 grid-bg opacity-40" />
          <div className="relative">
            <Terminal className="mx-auto h-8 w-8 text-neon-cyan" />
            <h2 className="mt-4 font-display text-3xl font-black sm:text-4xl">
              Siap <span className="text-gradient">nge-build</span> sesuatu yang gila?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Daftar gratis, langsung dapet 100 request/hari. Nggak perlu kartu kredit.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register">
                <Button size="lg" variant="neon" className="gap-2">
                  Start Building <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/tools">
                <Button size="lg" variant="outline" className="gap-2">
                  <Github className="h-4 w-4" /> Coba Tools Dulu
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 text-sm sm:grid-cols-4">
          <div className="sm:col-span-2">
            <div className="font-display text-lg font-black">
              NEURAL<span className="text-gradient"> AI</span> STUDIO
            </div>
            <p className="mt-2 max-w-sm text-xs text-muted-foreground">
              Platform AI generatif all-in-one: chat multi-model, image generation, downloader sosial media,
              media tools, photo lab, converter, scraper & utility.
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider">Fitur</p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li><Link href="/chat" className="hover:text-primary">AI Chat</Link></li>
              <li><Link href="/image" className="hover:text-primary">AI Image</Link></li>
              <li><Link href="/downloader" className="hover:text-primary">Downloader</Link></li>
              <li><Link href="/tools" className="hover:text-primary">Utilities</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider">Akun</p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li><Link href="/login" className="hover:text-primary">Login</Link></li>
              <li><Link href="/register" className="hover:text-primary">Register</Link></li>
              <li><Link href="/dashboard" className="hover:text-primary">Dashboard</Link></li>
              <li><Link href="/pricing" className="hover:text-primary">Pricing</Link></li>
            </ul>
          </div>
        </div>
        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Neural AI Studio. Dibangun dengan Next.js 14 · Groq · NVIDIA NIM.
        </p>
      </footer>
    </>
  );
}
