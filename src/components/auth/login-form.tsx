"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { LogIn, Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui";
import { useToast } from "@/components/toast";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { error: toastError, success } = useToast();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const callbackUrl = params.get("callbackUrl") || "/dashboard";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      toastError("Login gagal", "Email atau password salah.");
      return;
    }
    success("Selamat datang kembali!", "Mengalihkan ke dashboard...");
    router.push(callbackUrl);
    router.refresh();
  };

  const demo = async () => {
    setEmail(process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@neuralai.studio");
    setPassword("neuraladmin2025");
    setLoading(true);
    const res = await signIn("credentials", {
      email: "admin@neuralai.studio",
      password: "neuraladmin2025",
      redirect: false,
    });
    setLoading(false);
    if (res?.error) return toastError("Login demo gagal", "Akun admin belum kebentuk.");
    success("Login sebagai ADMIN", "Kuota unlimited aktif.");
    router.push("/dashboard");
    router.refresh();
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
            Masuk ke <span className="text-gradient">Neural AI</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">Lanjutkan perjalanan AI lu.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lu@email.com"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={show ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full gap-2" variant="neon" loading={loading}>
            <LogIn className="h-4 w-4" /> Masuk
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> atawa <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full gap-2" onClick={demo} disabled={loading}>
          <ShieldCheck className="h-4 w-4 text-neon-lime" /> Login Demo Admin (unlimited)
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Belum punya akun?{" "}
          <Link href="/register" className="font-semibold text-neon-cyan hover:underline">
            Daftar gratis
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
