"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Shield, Users, Activity, HardDrive, RefreshCw, Crown, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Badge, Select, Tabs } from "@/components/ui";
import { useToast } from "@/components/toast";
import { formatNumber, timeAgo } from "@/lib/utils";

export default function AdminPage() {
  const { success, error: toastError } = useToast();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [denied, setDenied] = React.useState(false);
  const [tab, setTab] = React.useState("users");
  const [query, setQuery] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/overview");
      if (r.status === 403) {
        setDenied(true);
        return;
      }
      const j = await r.json();
      setData(j);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const changePlan = async (userId: string, plan: string) => {
    const r = await fetch("/api/admin/overview", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, plan }),
    });
    const j = await r.json();
    if (!j.ok) return toastError("Gagal", j.error);
    success("Diupdate", `Plan jadi ${plan}`);
    load();
  };

  const changeRole = async (userId: string, role: string) => {
    const r = await fetch("/api/admin/overview", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    const j = await r.json();
    if (!j.ok) return toastError("Gagal", j.error);
    success("Diupdate", `Role jadi ${role}`);
    load();
  };

  if (denied)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Shield className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 font-display text-2xl font-black">Akses ditolak</h1>
        <p className="mt-2 text-sm text-muted-foreground">Halaman ini cuma buat akun dengan role ADMIN.</p>
      </div>
    );

  if (loading || !data)
    return (
      <div className="grid h-[70vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-neon-cyan" />
      </div>
    );

  const filtered = (data.users || []).filter(
    (u: any) =>
      (u.email || "").toLowerCase().includes(query.toLowerCase()) ||
      (u.name || "").toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-5">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-black sm:text-3xl">
            <Shield className="h-6 w-6 text-neon-lime" /> Admin <span className="text-gradient">Panel</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">Kelola user, pantau aktivitas & statistik platform.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="ml-auto gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { icon: <Users className="h-4 w-4" />, label: "Total user", value: data.counts.users },
          { icon: <Activity className="h-4 w-4" />, label: "Pesan chat", value: data.counts.messages },
          { icon: <HardDrive className="h-4 w-4" />, label: "Download", value: data.counts.downloads },
          { icon: <Crown className="h-4 w-4" />, label: "Generate", value: data.counts.generations },
          { icon: <Activity className="h-4 w-4" />, label: "Online", value: data.stats?.online || 1 },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-border bg-card/60 p-4">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {s.icon} {s.label}
            </p>
            <p className="mt-1 font-display text-xl font-black text-neon-cyan">{formatNumber(s.value)}</p>
          </motion.div>
        ))}
      </div>

      <Tabs
        tabs={[
          { id: "users", label: `Users (${data.counts.users})` },
          { id: "activity", label: "Aktivitas terbaru" },
          { id: "media", label: "Download terbaru" },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-5"
      />

      {tab === "users" && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle>Daftar user</CardTitle>
              <div className="relative ml-auto w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari email / nama..." className="h-9 pl-9 text-xs" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2">User</th>
                    <th className="py-2">Role</th>
                    <th className="py-2">Plan</th>
                    <th className="py-2">Request hari ini</th>
                    <th className="py-2">Total request</th>
                    <th className="py-2">Gabung</th>
                    <th className="py-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u: any) => (
                    <tr key={u.id} className="border-b border-border/50">
                      <td className="py-2">
                        <p className="font-medium">{u.name || "-"}</p>
                        <p className="text-[10px] text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="py-2">
                        <Select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} className="h-8 w-24 text-[11px]">
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                        </Select>
                      </td>
                      <td className="py-2">
                        <Select value={u.plan} onChange={(e) => changePlan(u.id, e.target.value)} className="h-8 w-28 text-[11px]">
                          <option value="FREE">FREE</option>
                          <option value="PRO">PRO</option>
                          <option value="ENTERPRISE">ENTERPRISE</option>
                        </Select>
                      </td>
                      <td className="py-2 font-mono">{u.dailyRequests}</td>
                      <td className="py-2 font-mono">{formatNumber(u.totalRequests || 0)}</td>
                      <td className="py-2 text-muted-foreground">{timeAgo(u.createdAt)}</td>
                      <td className="py-2">
                        {u.role === "ADMIN" ? <Badge variant="lime">unlimited</Badge> : <Badge variant="muted">{u.plan}</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "activity" && (
        <Card>
          <CardHeader>
            <CardTitle>Log aktivitas</CardTitle>
            <CardDescription>60 aktivitas terakhir dari semua user.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {(data.activities || []).map((a: any) => (
                <div key={a.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">
                  <Badge variant="neon">{a.action}</Badge>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{a.detail || "-"}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{timeAgo(a.createdAt)}</span>
                </div>
              ))}
              {!data.activities?.length && <p className="py-6 text-center text-xs text-muted-foreground">Belum ada aktivitas.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "media" && (
        <Card>
          <CardHeader>
            <CardTitle>Download terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {(data.downloads || []).map((d: any) => (
                <a
                  key={d.id}
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:border-primary/40"
                >
                  <Badge variant="magenta">{d.platform}</Badge>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{d.title || d.url}</span>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(d.createdAt)}</span>
                </a>
              ))}
              {!data.downloads?.length && <p className="py-6 text-center text-xs text-muted-foreground">Belum ada download.</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
