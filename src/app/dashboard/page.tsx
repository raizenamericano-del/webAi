"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  KeyRound,
  Download,
  Image as ImageIcon,
  MessageSquare,
  Copy,
  Check,
  Trash2,
  Plus,
  RefreshCw,
  Zap,
  Crown,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label, Badge, Tabs, Progress, Skeleton } from "@/components/ui";
import { useToast } from "@/components/toast";
import { formatNumber, timeAgo } from "@/lib/utils";

export default function DashboardPage() {
  const { success, error: toastError } = useToast();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState("overview");
  const [keys, setKeys] = React.useState<any[]>([]);
  const [newKeyName, setNewKeyName] = React.useState("Key gue");
  const [newToken, setNewToken] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [u, k] = await Promise.all([
        fetch("/api/user/usage").then((r) => r.json()),
        fetch("/api/user/api-keys").then((r) => r.json()),
      ]);
      setData(u);
      setKeys(k.keys || []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const createKey = async () => {
    const r = await fetch("/api/user/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName }),
    });
    const j = await r.json();
    if (!j.ok) return toastError("Gagal", j.error);
    setNewToken(j.token);
    success("API key dibuat!", "Simpan sekarang — cuma muncul sekali.");
    load();
  };

  const revokeKey = async (id: string) => {
    await fetch(`/api/user/api-keys?id=${id}`, { method: "DELETE" });
    success("Dicabut", "API key udah nggak berlaku.");
    load();
  };

  if (loading)
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );

  if (!data?.user)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-black">Belum login</h1>
        <p className="mt-2 text-sm text-muted-foreground">Masuk dulu buat lihat dashboard lu.</p>
        <Link href="/login?callbackUrl=/dashboard">
          <Button variant="neon" className="mt-4">
            Login
          </Button>
        </Link>
      </div>
    );

  const { usage, totals, activities, user } = data;
  const pct = usage.unlimited ? 100 : Math.min(100, (usage.used / Math.max(1, usage.limit)) * 100);

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-5">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-neon-cyan to-neon-magenta font-display text-lg font-black text-black">
            {(user.name || user.email).slice(0, 2).toUpperCase()}
          </span>
          <div>
            <h1 className="font-display text-xl font-black">{user.name || user.email}</h1>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              {user.email}
              {user.role === "ADMIN" ? (
                <Badge variant="lime">ADMIN · UNLIMITED</Badge>
              ) : (
                <Badge variant={user.plan === "PRO" ? "neon" : "muted"}>{user.plan}</Badge>
              )}
            </p>
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          {user.role !== "ADMIN" && user.plan === "FREE" && (
            <Link href="/pricing">
              <Button variant="neon" size="sm" className="gap-2">
                <Crown className="h-3.5 w-3.5" /> Upgrade
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Tabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "keys", label: "API Keys" },
          { id: "history", label: "Riwayat" },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-5"
      />

      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<Zap className="h-4 w-4" />} label="Request hari ini" value={`${formatNumber(usage.used)} / ${usage.unlimited ? "∞" : formatNumber(usage.limit)}`} accent="text-neon-cyan" />
            <StatCard icon={<MessageSquare className="h-4 w-4" />} label="Total thread" value={formatNumber(totals.threads)} accent="text-neon-magenta" />
            <StatCard icon={<ImageIcon className="h-4 w-4" />} label="Gambar dibuat" value={formatNumber(totals.images)} accent="text-neon-lime" />
            <StatCard icon={<Download className="h-4 w-4" />} label="Media diunduh" value={formatNumber(totals.downloads)} accent="text-neon-violet" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Kuota harian</CardTitle>
              <CardDescription>
                Reset otomatis tiap 24 jam. Total request sepanjang masa: {formatNumber(totals.requests)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress value={pct} />
              <p className="text-xs text-muted-foreground">
                {usage.used} terpakai · {usage.unlimited ? "tanpa batas (unlimited)" : `${usage.remaining} tersisa`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-neon-cyan" /> Aktivitas terbaru
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!activities?.length ? (
                <p className="py-6 text-center text-xs text-muted-foreground">Belum ada aktivitas. Yuk cobain fitur AI-nya!</p>
              ) : (
                <div className="space-y-1.5">
                  {activities.slice(0, 15).map((a: any) => (
                    <div key={a.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">
                      <Badge variant="neon">{a.action}</Badge>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{a.detail || "-"}</span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(a.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "keys" && (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-neon-lime" /> API Key Pribadi
              </CardTitle>
              <CardDescription>
                Akses Neural AI dari aplikasi lu sendiri via{" "}
                <code className="text-neon-cyan">/api/public/v1/chat</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[200px] flex-1 space-y-1.5">
                  <Label>Nama key</Label>
                  <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
                </div>
                <Button variant="neon" onClick={createKey} className="gap-2">
                  <Plus className="h-4 w-4" /> Bikin Key
                </Button>
              </div>

              {newToken && (
                <div className="rounded-xl border border-neon-lime/40 bg-neon-lime/5 p-3">
                  <p className="mb-1 text-xs font-semibold text-neon-lime">Simpan token ini sekarang — nggak bakal ditampilkan lagi!</p>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 break-all font-mono text-xs text-neon-lime">{newToken}</code>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(newToken);
                        success("Disalin", "Token masuk clipboard.");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {!keys.length && <p className="py-4 text-center text-xs text-muted-foreground">Belum punya API key.</p>}
                {keys.map((k: any) => (
                  <div key={k.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3 text-xs">
                    <KeyRound className="h-4 w-4 text-neon-cyan" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{k.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {k.prefix}•••••••• · {k.requests} request · {k.lastUsedAt ? timeAgo(k.lastUsedAt) : "belum dipakai"}
                      </p>
                    </div>
                    {k.revoked ? (
                      <Badge variant="danger">revoked</Badge>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => revokeKey(k.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border bg-black/40 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contoh pemakaian</p>
                <pre className="scroll-thin overflow-auto font-mono text-[11px] text-neon-cyan">{`curl -X POST ${typeof window !== "undefined" ? window.location.origin : ""}/api/public/v1/chat \\
  -H "Authorization: Bearer ${newToken || "na_xxxxx"}" \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"role":"user","content":"Halo!"}]}'`}</pre>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-neon-magenta" /> Hasil generate
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!data.generations?.length ? (
                <p className="py-6 text-center text-xs text-muted-foreground">Belum ada hasil generate.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {data.generations
                    .filter((g: any) => g.type === "image")
                    .slice(0, 12)
                    .map((g: any) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={g.id} src={`/api/g/${g.id}`} alt={g.prompt} className="aspect-square w-full rounded-xl border border-border object-cover" loading="lazy" />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-4 w-4 text-neon-cyan" /> Riwayat download
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!data.downloads?.length ? (
                <p className="py-6 text-center text-xs text-muted-foreground">Belum ada download.</p>
              ) : (
                <div className="space-y-1.5">
                  {data.downloads.slice(0, 15).map((d: any) => (
                    <a
                      key={d.id}
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:border-primary/40"
                    >
                      <Badge variant="magenta">{d.platform}</Badge>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{d.title || d.url}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card/60 p-4">
      <p className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground ${accent}`}>
        {icon} {label}
      </p>
      <p className="mt-1.5 font-display text-xl font-black">{value}</p>
    </motion.div>
  );
}
