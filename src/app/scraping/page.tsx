"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, BarChart3, KeyRound, Search, Loader2, Link2, Image as ImageIcon, Hash, Clock, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label, Select, Badge, Tabs } from "@/components/ui";
import { useToast } from "@/components/toast";
import { formatNumber } from "@/lib/utils";

export default function ScrapingPage() {
  const [tab, setTab] = React.useState("web");

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-5">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-black sm:text-3xl">
          Web & Data <span className="text-gradient">Scraper</span>
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Ambil isi website, analitik sosial media, riset keyword & analisis kompetitor.
        </p>
      </div>

      <Tabs
        tabs={[
          { id: "web", label: "Web Scraper" },
          { id: "social", label: "Social Analytics" },
          { id: "keywords", label: "Keyword Research" },
          { id: "competitor", label: "Competitor Analysis" },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-5"
      />

      {tab === "web" && <WebScraper />}
      {tab === "social" && <SocialAnalytics />}
      {tab === "keywords" && <KeywordResearch />}
      {tab === "competitor" && <CompetitorAnalysis />}
    </div>
  );
}

function post(mode: string, payload: any) {
  return fetch("/api/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, ...payload }),
  }).then((r) => r.json());
}

/* ============================ WEB SCRAPER ============================ */
function WebScraper() {
  const { error: toastError, success } = useToast();
  const [url, setUrl] = React.useState("https://example.com");
  const [busy, setBusy] = React.useState(false);
  const [data, setData] = React.useState<any>(null);

  const run = async () => {
    setBusy(true);
    try {
      const j = await post("page", { url });
      if (!j.ok) throw new Error(j.error);
      setData(j.data);
      success("Kelar!", "Halaman berhasil di-scrape.");
    } catch (e: any) {
      toastError("Gagal", e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-neon-cyan" /> Web Scraper
        </CardTitle>
        <CardDescription>Ambil teks, metadata, semua link & gambar dari sebuah halaman.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="h-11" />
          <Button variant="neon" className="h-11 gap-2" onClick={run} loading={busy}>
            <Search className="h-4 w-4" /> Scrape
          </Button>
        </div>

        {data && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat icon={<Server className="h-3.5 w-3.5" />} label="Status" value={String(data.status)} />
              <Stat icon={<Clock className="h-3.5 w-3.5" />} label="Ukuran HTML" value={`${(data.contentLength / 1024).toFixed(1)} KB`} />
              <Stat icon={<Link2 className="h-3.5 w-3.5" />} label="Jumlah link" value={String(data.links.length)} />
            </div>

            <div className="rounded-xl border border-border p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</p>
              <p className="text-sm">{data.title || "-"}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</p>
              <p className="text-sm text-muted-foreground">{data.description || "-"}</p>
            </div>

            <div>
              <Label>Teks (20.000 karakter pertama)</Label>
              <pre className="scroll-thin mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-black/40 p-3 text-[12px]">
                {data.text.slice(0, 3000) || "(kosong)"}
              </pre>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => {
                  const blob = new Blob([data.text], { type: "text/plain" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = "scraped.txt";
                  a.click();
                }}
              >
                Download .txt
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Links ({data.links.length})</Label>
                <div className="scroll-thin mt-1 max-h-40 space-y-0.5 overflow-auto rounded-xl border border-border p-2 text-[11px]">
                  {data.links.slice(0, 40).map((l: string, i: number) => (
                    <a key={i} href={l} target="_blank" rel="noreferrer" className="block truncate text-neon-cyan hover:underline">
                      {l}
                    </a>
                  ))}
                </div>
              </div>
              <div>
                <Label>Images ({data.images.length})</Label>
                <div className="scroll-thin mt-1 grid max-h-40 grid-cols-4 gap-1 overflow-auto rounded-xl border border-border p-2">
                  {data.images.slice(0, 20).map((src: string, i: number) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={src} alt="" className="aspect-square w-full rounded object-cover" referrerPolicy="no-referrer" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </p>
      <p className="mt-1 font-display text-lg font-bold text-neon-cyan">{value}</p>
    </div>
  );
}

/* ========================= SOCIAL ANALYTICS ========================= */
function SocialAnalytics() {
  const { error: toastError, success } = useToast();
  const [platform, setPlatform] = React.useState("tiktok");
  const [username, setUsername] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [data, setData] = React.useState<any>(null);

  const run = async () => {
    if (!username.trim()) return toastError("Kosong", "Isi username dulu.");
    setBusy(true);
    try {
      const j = await post("social", { platform, username });
      if (!j.ok) {
        toastError("Nggak ketemu", j.error);
        setData(null);
        return;
      }
      setData(j.data);
      success("Ketemu!", `Data @${username} berhasil diambil.`);
    } catch (e: any) {
      toastError("Gagal", e.message);
    } finally {
      setBusy(false);
    }
  };

  const eng = data?.followers && data?.likes ? ((data.likes / (data.followers * (data.posts || 1))) * 100).toFixed(2) : "-";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-neon-lime" /> Social Media Analytics
        </CardTitle>
        <CardDescription>TikTok · Instagram · X/Twitter · YouTube · Facebook (data publik, best effort).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={platform} onChange={(e) => setPlatform(e.target.value)} className="sm:w-40">
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="twitter">X / Twitter</option>
            <option value="youtube">YouTube</option>
            <option value="facebook">Facebook</option>
          </Select>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username (tanpa @)" className="h-10" />
          <Button variant="neon" className="gap-2" onClick={run} loading={busy}>
            <Search className="h-4 w-4" /> Ambil Data
          </Button>
        </div>

        {data && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-xl border border-border p-4">
              {data.avatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.avatar} alt="" className="h-16 w-16 rounded-full object-cover" referrerPolicy="no-referrer" />
              )}
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-display text-lg font-bold">
                  @{data.username}
                  {data.verified && <Badge variant="neon">verified</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">{data.name || ""}</p>
                {data.bio && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{data.bio}</p>}
                <p className="mt-1 text-[10px] uppercase tracking-wider text-neon-lime">sumber: {data.source}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Stat icon={<Hash className="h-3.5 w-3.5" />} label="Followers" value={data.followers ? formatNumber(data.followers) : "-"} />
              <Stat icon={<Hash className="h-3.5 w-3.5" />} label="Following" value={data.following ? formatNumber(data.following) : "-"} />
              <Stat icon={<Hash className="h-3.5 w-3.5" />} label="Posts" value={data.posts ? formatNumber(data.posts) : "-"} />
              <Stat icon={<Hash className="h-3.5 w-3.5" />} label="Total Likes" value={data.likes ? formatNumber(data.likes) : "-"} />
              <Stat icon={<BarChart3 className="h-3.5 w-3.5" />} label="Engagement" value={typeof eng === "string" ? `${eng}%` : "-"} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ========================= KEYWORD RESEARCH ========================= */
function KeywordResearch() {
  const { error: toastError, success } = useToast();
  const [seed, setSeed] = React.useState("kopi susu");
  const [busy, setBusy] = React.useState(false);
  const [data, setData] = React.useState<any[]>([]);

  const run = async () => {
    setBusy(true);
    try {
      const j = await post("keywords", { seed });
      if (!j.ok) throw new Error(j.error);
      setData(j.data);
      success("Kelar!", `${j.data.length} ide keyword.`);
    } catch (e: any) {
      toastError("Gagal", e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-neon-magenta" /> Keyword Research
        </CardTitle>
        <CardDescription>Ide keyword dari Google Suggest + DuckDuckGo + variasi long-tail.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="kata kunci awal" className="h-11" />
          <Button variant="neon" className="h-11 gap-2" onClick={run} loading={busy}>
            <Search className="h-4 w-4" /> Riset
          </Button>
        </div>

        {!!data.length && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {data.map((k, i) => (
                <span
                  key={i}
                  className={`rounded-lg border px-2.5 py-1 text-xs ${
                    k.source === "google"
                      ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan"
                      : k.source === "duckduckgo"
                      ? "border-neon-magenta/40 bg-neon-magenta/10 text-neon-magenta"
                      : "border-border bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  {k.keyword}
                </span>
              ))}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const blob = new Blob([data.map((d) => d.keyword).join("\n")], { type: "text/plain" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "keywords.txt";
                a.click();
              }}
            >
              Download .txt
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ======================= COMPETITOR ANALYSIS ======================== */
function CompetitorAnalysis() {
  const { error: toastError, success } = useToast();
  const [url, setUrl] = React.useState("https://tokopedia.com");
  const [busy, setBusy] = React.useState(false);
  const [data, setData] = React.useState<any>(null);

  const run = async () => {
    setBusy(true);
    try {
      const j = await post("competitor", { url });
      if (!j.ok) throw new Error(j.error);
      setData(j.data);
      success("Kelar!", "Analisis kompetitor selesai.");
    } catch (e: any) {
      toastError("Gagal", e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-neon-violet" /> Competitor Analysis
        </CardTitle>
        <CardDescription>Struktur halaman, kata kunci teratas, teknologi & performa load sebuah website.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://kompetitor.com" className="h-11" />
          <Button variant="neon" className="h-11 gap-2" onClick={run} loading={busy}>
            <Search className="h-4 w-4" /> Analisis
          </Button>
        </div>

        {data && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat icon={<Clock className="h-3.5 w-3.5" />} label="Load time" value={`${data.loadMs} ms`} />
              <Stat icon={<Hash className="h-3.5 w-3.5" />} label="Kata" value={formatNumber(data.wordCount)} />
              <Stat icon={<Link2 className="h-3.5 w-3.5" />} label="Internal link" value={String(data.counts.internalLinks)} />
              <Stat icon={<ImageIcon className="h-3.5 w-3.5" />} label="Gambar" value={String(data.counts.images)} />
            </div>

            <div className="rounded-xl border border-border p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</p>
              <p className="text-sm">{data.title}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</p>
              <p className="text-sm text-muted-foreground">{data.description}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Teknologi terdeteksi</Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {data.tech.length ? (
                    data.tech.map((t: string) => (
                      <Badge key={t} variant="neon">
                        {t}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">Nggak kedeteksi</span>
                  )}
                </div>
              </div>

              <div>
                <Label>Top keyword</Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {data.topKeywords.slice(0, 16).map((k: any) => (
                    <span key={k.word} className="rounded-lg border border-border bg-secondary/50 px-2 py-0.5 text-[11px]">
                      {k.word} <span className="text-neon-cyan">{k.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label>Struktur heading</Label>
              <div className="scroll-thin mt-1 max-h-48 space-y-1 overflow-auto rounded-xl border border-border p-3 text-xs">
                {data.headings.h1.map((h: string, i: number) => (
                  <p key={"h1" + i} className="font-semibold text-neon-cyan">
                    H1: {h}
                  </p>
                ))}
                {data.headings.h2.map((h: string, i: number) => (
                  <p key={"h2" + i} className="pl-2">
                    H2: {h}
                  </p>
                ))}
                {data.headings.h3.map((h: string, i: number) => (
                  <p key={"h3" + i} className="pl-4 text-muted-foreground">
                    H3: {h}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
