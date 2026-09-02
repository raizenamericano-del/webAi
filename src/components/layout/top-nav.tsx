"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Menu, X, Sun, Moon, LogOut, User, LayoutDashboard, Shield, Sparkles } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/chat", label: "AI Chat" },
  { href: "/image", label: "AI Image" },
  { href: "/downloader", label: "Downloader" },
  { href: "/media", label: "Media" },
  { href: "/photo", label: "Photo Lab" },
  { href: "/converter", label: "Converter" },
  { href: "/scraping", label: "Scraper" },
  { href: "/tools", label: "Utilities" },
  { href: "/pricing", label: "Pricing" },
];

export function TopNav() {
  const pathname = usePathname();
  const { resolved, setTheme } = useTheme();
  const { data: session, status } = useSession();
  const [open, setOpen] = React.useState(false);
  const [menu, setMenu] = React.useState(false);

  const user: any = session?.user;

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-3 sm:px-5">
        <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link href="/" className="group flex items-center gap-2">
          <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-neon-cyan to-neon-magenta">
            <Sparkles className="h-4 w-4 text-black" />
            <span className="absolute inset-0 animate-pulse rounded-lg bg-neon-cyan/40 blur-md" />
          </span>
          <span className="hidden font-display text-sm font-black tracking-tight sm:block">
            NEURAL<span className="text-gradient"> AI</span> STUDIO
          </span>
        </Link>

        <nav className="no-scrollbar ml-2 hidden flex-1 items-center gap-0.5 overflow-x-auto md:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "relative whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-lg bg-primary/15 ring-1 ring-primary/40"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative">{l.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
            aria-label="toggle theme"
          >
            {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {status === "loading" ? (
            <div className="h-9 w-20 animate-pulse rounded-lg bg-secondary" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setMenu((v) => !v)}
                className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-xs"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-neon-cyan to-neon-magenta text-[10px] font-bold text-black">
                  {(user.name || user.email || "U").slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden max-w-[110px] truncate sm:block">{user.name || user.email}</span>
                {user.role === "ADMIN" && <Shield className="h-3.5 w-3.5 text-neon-lime" />}
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-border bg-card p-2 shadow-2xl">
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      {user.email}
                      <div className="mt-1 font-semibold text-neon-cyan">
                        {user.role === "ADMIN" ? "ADMIN · UNLIMITED" : `Plan ${user.plan || "FREE"}`}
                      </div>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setMenu(false)}
                      className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-secondary"
                    >
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setMenu(false)}
                      className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-secondary"
                    >
                      <User className="h-4 w-4" /> Settings
                    </Link>
                    {user.role === "ADMIN" && (
                      <Link
                        href="/admin"
                        onClick={() => setMenu(false)}
                        className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-secondary"
                      >
                        <Shield className="h-4 w-4" /> Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:border-primary/60"
              >
                Login
              </Link>
              <Link href="/register" className="btn-neon hidden px-3 py-1.5 text-xs sm:block">
                Daftar Gratis
              </Link>
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background/95 px-3 py-3 md:hidden">
          <div className="grid grid-cols-2 gap-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                {l.label}
              </Link>
            ))}
          </div>
          {!user && (
            <Link href="/register" className="btn-neon mt-3 block w-full text-center text-sm">
              Daftar Gratis
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
