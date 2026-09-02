import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(len = 12) {
  return Math.random().toString(36).slice(2, 2 + len) + Date.now().toString(36).slice(-4);
}

export function formatNumber(n: number) {
  try {
    return new Intl.NumberFormat("id-ID").format(n);
  } catch {
    return String(n);
  }
}

export function timeAgo(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}d lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j lalu`;
  const dd = Math.floor(h / 24);
  if (dd < 30) return `${dd}h lalu`;
  const mo = Math.floor(dd / 30);
  if (mo < 12) return `${mo}bl lalu`;
  return `${Math.floor(mo / 12)}th lalu`;
}

export function bytesToSize(bytes: number) {
  if (!bytes || bytes <= 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function extractDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function safeJsonParse<T>(v: string | null | undefined, fallback: T): T {
  if (!v) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

/** Ubah error teknis jadi pesan yang bisa dibaca user. */
export function friendlyError(e: any, fallback = "Terjadi kesalahan.") {
  const msg = String(e?.message || e || fallback);
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|socket|network/i.test(msg)) {
    if (/api\.groq\.com|groq/i.test(msg))
      return "Gagal terhubung ke Groq. Cek koneksi internet server atau API key lu (Settings → Bring Your Own Key).";
    if (/nvidia/i.test(msg))
      return "Gagal terhubung ke NVIDIA NIM. Cek koneksi internet server atau API key lu.";
    return "Gagal terhubung ke server tujuan. Cek koneksi internet, atau endpoint-nya lagi blokir request dari server ini.";
  }
  return msg;
}
