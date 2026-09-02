"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DownloadCloud,
  Link2,
  Download,
  Play,
  Loader2,
  Image as ImageIcon,
  Music,
  Video,
  AlertTriangle,
  History,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Input, Badge, EmptyState, Tabs } from "@/components/ui";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  { id: "auto", label: "🔍 Auto Detect", color: "text-neon-cyan" },
  { id: "tiktok", label: "TikTok", color: "text-neon-magenta" },
  { id: "instagram", label: "Instagram", color: "text-neon-magenta" },
  { id: "youtube", label: "YouTube", color: "text-red-400" },
  { id: "twitter", label: "X / Twitter", color: "text-neon-cyan" },
  { id: "facebook", label: "Facebook", color: "text-blue-400" },
  { id: "pinterest", label: "Pinterest", color: "text-red-500" },
  { id: "reddit", label: "Reddit", color: "text-orange-400" },
  { id: "spotify", label: "Spotify", color: "text-green-400" },
  { id: "soundcloud", label: "SoundCloud", color: "text-orange-500" },
  { id: "capcut", label: "CapCut", color: "text-neon-lime" },
];

const EXAMPLES: Record<string, string> = {
  tiktok: "https://www.tiktok.com/@user/video/1234567890",
  instagram: "https://www.instagram.com/reel/ABC123/",
  youtube: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  twitter: "https://x.com/user/status/1234567890",
  facebook: "https://www.facebook.com/watch/?v=1234567890",
  pinterest: "https://www.pinterest.com/pin/1234567890/",
  reddit: "https://www.reddit.com/r/funny/comments/abc123/title/",
  spotify: "https://open.spotify.com/track/1234567890",
  soundcloud: "https://soundcloud.com/artist/track",
  capcut: "https://www.capcut.com/template-detail/1234567890",
};

type Media = { url: string; type: string; quality?: string; ext?: string };
type Result = {
  platform: string;
  title?: string;
  author?: string;
  thumbnail?: string;
  source: string;
  medias: Media[];
  note?: string;
};

export default function DownloaderPage() {
  const { error: toastError, info, success } = useToast();
  const [platform, setPlatform] = React.useState("auto");
  const [url, setUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<Result | null>(null);
  const [history, setHistory] = React.useState<any[]>([]);

  const loadHistory = React.useCallback(async () => {
    try {
      const r = await fetch("/api/history?type=downloads");
      const j = await r.json();
      setHistory(j.items || []);
    } catch {}
  }, []);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const fetchMedia = async (target?: string) => {
    const u = (target || url).trim();
    if (!u) return toastError("URL kosong", "Masukin link dulu bang.");
    setLoading(true);
    setResult(null);
    info("Mengambil media...", "Sabar, lagi ngubek server platform-nya.");
    try {
      const r = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u, platform }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setResult(j);
      setUrl(u);
      success("Ketemu!", `${j.medias.length} media dari ${j.platform}`);
      loadHistory();
    } catch (e: any) {
      toastError("Gagal", e.message);
    } finally {
      setLoading(false);
    }
  };

  const dl = (m: Media, title?: string) => {
    const ext = m.ext || (m.type === "audio" ? "mp3" : m.type === "image" ? "jpg" : "mp4");
    const name = `${(title || "media").replace(/[^\w\s-]/g, "").slice(0, 50)}.${ext}`;
    window.open(`/api/proxy?url=${encodeURIComponent(m.url)}&name=${encodeURIComponent(name)}`, "_blank");
  };

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-5">
      <div className="mb-5 text-center">
        <h1 className="font-display text-2xl font-black sm:text-3xl">
          Social Media <span className="text-gradient">Downloader</span>
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          TikTok (no watermark) · Instagram · YouTube · X · Facebook · Pinterest · Reddit · Spotify · SoundCloud · CapCut
        </p>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPlatform(p.id);
                if (EXAMPLES[p.id] && !url) setUrl(EXAMPLES[p.id]);
              }}
              className={cn(
                "whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                platform === p.id
                  ? "border-primary/60 bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchMedia()}
              placeholder={EXAMPLES[platform] || "Paste link di sini..."}
              className="h-11 pl-9"
            />
          </div>
          <Button variant="neon" className="h-11 gap-2" onClick={() => fetchMedia()} loading={loading}>
            {!loading && <DownloadCloud className="h-4 w-4" />} Ambil Media
          </Button>
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground">
          Gratis & tanpa batas kuota. Hasil di-stream lewat server kita biar aman dari blokir hotlink.
        </p>
      </Card>

      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5 space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="shimmer relative h-24 overflow-hidden rounded-2xl border border-border bg-secondary/40">
                <div className="absolute inset-0 grid place-items-center">
                  <Loader2 className="h-5 w-5 animate-spin text-neon-cyan" />
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {result && !loading && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
            <Card className="overflow-hidden">
              <div className="flex flex-col gap-4 p-4 sm:flex-row">
                {result.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.thumbnail}
                    alt=""
                    className="h-32 w-full rounded-xl object-cover sm:w-48"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge variant="neon">{result.platform.toUpperCase()}</Badge>
                    <Badge variant="muted">via {result.source}</Badge>
                    {result.author && <Badge variant="magenta">{result.author}</Badge>}
                  </div>
                  <h3 className="line-clamp-2 text-sm font-semibold">{result.title}</h3>

                  {result.note && (
                    <div className="mt-2 flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {result.note}
                    </div>
                  )}

                  <div className="mt-3 space-y-2">
                    {result.medias.map((m, i) => (
                      <div
                        key={i}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-secondary/30 p-2.5"
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-background">
                          {m.type === "video" ? (
                            <Video className="h-4 w-4 text-neon-cyan" />
                          ) : m.type === "audio" ? (
                            <Music className="h-4 w-4 text-neon-lime" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-neon-magenta" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{m.quality || m.type}</p>
                          <p className="truncate text-[10px] text-muted-foreground">.{m.ext || "?"}</p>
                        </div>

                        <div className="flex gap-1.5">
                          {m.type === "image" ? (
                            <Button size="sm" variant="ghost" onClick={() => window.open(m.url, "_blank")}>
                              <Play className="h-3.5 w-3.5" /> Lihat
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => window.open(m.url, "_blank")}>
                              <Play className="h-3.5 w-3.5" /> Stream
                            </Button>
                          )}
                          <Button size="sm" variant="neon" onClick={() => dl(m, result.title)}>
                            <Download className="h-3.5 w-3.5" /> Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* riwayat */}
      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <History className="h-4 w-4 text-neon-cyan" /> Riwayat download
          </h2>
          <div className="space-y-1.5">
            {history.slice(0, 12).map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  setUrl(h.url);
                  fetchMedia(h.url);
                }}
                className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-xs transition-colors hover:border-primary/40"
              >
                <Check className="h-3.5 w-3.5 text-neon-lime" />
                <span className="w-20 shrink-0 font-mono uppercase text-neon-cyan">{h.platform}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{h.title || h.url}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
