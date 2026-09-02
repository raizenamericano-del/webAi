import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { TopNav } from "@/components/layout/top-nav";
import { NeonCursor } from "@/components/neon-cursor";
import { PWARegister } from "@/components/pwa-register";
import { ensureAdmin } from "@/lib/store";
import { loadStats } from "@/lib/realtime";

export const metadata: Metadata = {
  title: "NEURAL AI STUDIO — All-in-One Generative AI Platform",
  description:
    "AI Chat multi-model, AI Image Generator, Downloader sosial media, Video/Audio AI, Photo Lab, File Converter, Web Scraper & 20+ utility tools dalam satu platform.",
  manifest: "/manifest.webmanifest",
  keywords: ["AI", "Groq", "LLaMA 3", "NVIDIA NIM", "Image Generator", "TikTok Downloader", "Instagram Downloader"],
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  openGraph: {
    title: "NEURAL AI STUDIO",
    description: "20+ fitur AI generatif dalam satu website.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#05060a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// bootstrap ringan: pastikan admin ada & statistik ke-load
let booted = false;
async function boot() {
  if (booted) return;
  booted = true;
  try {
    await ensureAdmin();
    await loadStats();
  } catch (e) {
    console.error("[boot]", e);
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await boot();
  return (
    <html lang="id" suppressHydrationWarning className="dark">
      <body className="min-h-screen scroll-thin">
        <Providers>
          <NeonCursor />
          <PWARegister />
          <TopNav />
          <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
