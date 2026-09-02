import { allCounters, bumpCounter, countUsers, addActivity } from "./store";

/**
 * Realtime event bus (in-memory) buat live stats & notifikasi.
 * Dipakai endpoint SSE `/api/realtime` dan (opsional) server Socket.IO.
 */
type Listener = (event: string, data: any) => void;

const listeners = new Set<Listener>();

export type Stats = {
  chats: number;
  images: number;
  downloads: number;
  tools: number;
  users: number;
  online: number;
};

const stats: Stats = { chats: 0, images: 0, downloads: 0, tools: 0, users: 0, online: 1 };
const online = new Map<string, number>();
let loaded = false;

export function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function publish(event: string, data: any) {
  listeners.forEach((fn) => {
    try {
      fn(event, data);
    } catch {}
  });
}

export function getStats(): Stats & { timestamp: number } {
  const now = Date.now();
  for (const [id, last] of online) if (now - last > 60_000) online.delete(id);
  return { ...stats, online: Math.max(online.size, 1), timestamp: now };
}

export function heartbeat(id: string) {
  const before = online.size;
  online.set(id, Date.now());
  if (before !== online.size) publish("stats", getStats());
}

export function bumpStat(key: keyof Stats, amount = 1) {
  stats[key] += amount;
  bumpCounter(key, amount).catch(() => {});
  publish("stats", getStats());
}

/** Angka baseline supaya landing page keliatan hidup sebelum ada traffic beneran. */
const SEED: Record<string, number> = {
  chats: 184_320,
  images: 96_540,
  downloads: 312_875,
  tools: 58_210,
};

export async function loadStats() {
  if (loaded) return getStats();
  loaded = true;
  try {
    const rows = await allCounters();
    const map = Object.fromEntries((rows as any[]).map((r) => [r.key, Number(r.value)]));
    stats.chats = map.chats || SEED.chats;
    stats.images = map.images || SEED.images;
    stats.downloads = map.downloads || SEED.downloads;
    stats.tools = map.tools || SEED.tools;
    stats.users = await countUsers();
  } catch {
    stats.chats = SEED.chats;
    stats.images = SEED.images;
    stats.downloads = SEED.downloads;
    stats.tools = SEED.tools;
    stats.users = 1284;
  }
  publish("stats", getStats());
  return getStats();
}

export async function logActivity(
  userId: string | null,
  action: string,
  detail?: string,
  stat?: keyof Stats,
) {
  try {
    await addActivity(userId, action, detail);
  } catch {}
  bumpStat(stat || "tools");
  publish("activity", { userId, action, detail, at: Date.now() });
}
