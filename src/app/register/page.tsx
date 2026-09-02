"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { UserPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui";
import { useToast } from "@/components/toast";

export default function RegisterPage() {
  const router = useRouter();
  const { error: toastError, success } = useToast();
  const [form, setForm] = React.useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!j.ok) {
        toastError("Gagal daftar", j.error);
        return;
      }
      success("Akun dibuat!", "Langsung masuk...");
      const res = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      if (res?.error) {
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      toastError("Gagal", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="absolute inset-0 -z-10 grid-bg opacity-40" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-border bg-card/70 p-7 backdrop-blur-xl"
      >
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-black">
            Daftar <span className="text-gradient">Gratis</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">100 request/hari, tanpa kartu kredit.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Nama (opsional)</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama lu" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Email</label>
            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="lu@email.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Password</label>
            <Input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="minimal 6 karakter"
            />
          </div>
          <Button type="submit" className="w-full gap-2" variant="neon" loading={loading}>
            <UserPlus className="h-4 w-4" /> Bikin Akun
          </Button>
        </form>

        <div className="mt-5 rounded-xl border border-neon-cyan/30 bg-neon-cyan/5 p-3 text-[11px] text-muted-foreground">
          <div className="mb-1 flex items-center gap-1.5 font-semibold text-neon-cyan">
            <Sparkles className="h-3.5 w-3.5" /> Bonus
          </div>
          AI Chat multi-model, image generator, semua downloader & 20+ utility langsung bisa dipakai.
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Udah punya akun?{" "}
          <Link href="/login" className="font-semibold text-neon-cyan hover:underline">
            Masuk
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
