import { dbAll, dbGet, dbRun, insert, update, newId, b } from "./db";
import { hashPassword } from "./auth";

export type User = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  image: string | null;
  bio: string | null;
  role: string;
  plan: string;
  dailyRequests: number;
  totalRequests: number;
  requestResetAt: string | null;
  stripeCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Thread = {
  id: string;
  userId: string;
  title: string;
  model: string;
  pinned: number;
  createdAt: string;
  updatedAt: string;
};

export type Message = {
  id: string;
  threadId: string;
  userId: string | null;
  role: string;
  content: string;
  model: string | null;
  meta: string | null;
  createdAt: string;
};

const now = () => new Date().toISOString();

/* ------------------------------- USERS ------------------------------- */
export async function getUserByEmail(email: string) {
  return (await dbGet("SELECT * FROM users WHERE email = ?", [String(email).toLowerCase()])) as User | undefined;
}
export async function getUserById(id: string) {
  return (await dbGet("SELECT * FROM users WHERE id = ?", [id])) as User | undefined;
}
export async function createUser(data: {
  email: string;
  password: string;
  name?: string | null;
  role?: string;
  plan?: string;
}) {
  const user = await insert<User>("users", {
    email: data.email.toLowerCase(),
    name: data.name || data.email.split("@")[0],
    passwordHash: await hashPassword(data.password),
    role: data.role || "USER",
    plan: data.plan || "FREE",
    dailyRequests: 0,
    totalRequests: 0,
    requestResetAt: now(),
    createdAt: now(),
    updatedAt: now(),
  });
  return user;
}
export function updateUser(id: string, data: Partial<User>) {
  return update("users", id, data);
}
export async function countUsers() {
  const r = (await dbGet("SELECT COUNT(*) as n FROM users")) as any;
  return Number(r?.n || 0);
}
export async function listUsers(limit = 100) {
  return (await dbAll("SELECT * FROM users ORDER BY createdAt DESC LIMIT ?", [limit])) as User[];
}

/** Bikin akun admin default kalau belum ada (dipanggil saat boot). */
export async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || "admin@neuralai.studio").toLowerCase();
  const existing = await getUserByEmail(email);
  if (existing) {
    if (existing.role !== "ADMIN") await updateUser(existing.id, { role: "ADMIN" });
    return existing;
  }
  const user = await createUser({
    email,
    password: process.env.ADMIN_PASSWORD || "neuraladmin2025",
    name: "Administrator",
    role: "ADMIN",
    plan: "ENTERPRISE",
  });
  return user;
}

/* ------------------------------ THREADS ------------------------------ */
export async function listThreads(userId: string) {
  return (await dbAll("SELECT * FROM chat_threads WHERE userId = ? ORDER BY pinned DESC, updatedAt DESC", [
    userId,
  ])) as Thread[];
}
export async function getThread(id: string, userId?: string) {
  if (userId) return (await dbGet("SELECT * FROM chat_threads WHERE id = ? AND userId = ?", [id, userId])) as Thread | undefined;
  return (await dbGet("SELECT * FROM chat_threads WHERE id = ?", [id])) as Thread | undefined;
}
export function createThread(userId: string, title = "Percakapan baru", model = "llama-3.3-70b-versatile") {
  return insert<Thread>("chat_threads", {
    userId,
    title,
    model,
    pinned: 0,
    createdAt: now(),
    updatedAt: now(),
  });
}
export function updateThread(id: string, data: Partial<Thread>) {
  return update("chat_threads", id, { ...data, updatedAt: now() });
}
export async function deleteThread(id: string) {
  await dbRun("DELETE FROM chat_messages WHERE threadId = ?", [id]);
  await dbRun("DELETE FROM chat_threads WHERE id = ?", [id]);
}

/* ----------------------------- MESSAGES ------------------------------ */
export async function listMessages(threadId: string) {
  return (await dbAll("SELECT * FROM chat_messages WHERE threadId = ? ORDER BY createdAt ASC", [threadId])) as Message[];
}
export function addMessage(threadId: string, role: string, content: string, userId?: string, model?: string, meta?: any) {
  return insert<Message>("chat_messages", {
    threadId,
    role,
    content,
    userId: userId || null,
    model: model || null,
    meta: meta ? JSON.stringify(meta) : null,
    createdAt: now(),
  });
}
export async function deleteMessages(threadId: string) {
  await dbRun("DELETE FROM chat_messages WHERE threadId = ?", [threadId]);
}

/* ---------------------------- GENERATIONS ---------------------------- */
export function addGeneration(userId: string | null, type: string, prompt: string, resultUrl?: string, meta?: any) {
  return insert("generations", {
    userId,
    type,
    prompt,
    resultUrl: resultUrl || null,
    meta: meta ? JSON.stringify(meta) : null,
    createdAt: now(),
  });
}
export async function listGenerations(userId: string, type?: string, limit = 60) {
  if (type)
    return dbAll("SELECT * FROM generations WHERE userId = ? AND type = ? ORDER BY createdAt DESC LIMIT ?", [
      userId,
      type,
      limit,
    ]);
  return dbAll("SELECT * FROM generations WHERE userId = ? ORDER BY createdAt DESC LIMIT ?", [userId, limit]);
}

/* ----------------------------- DOWNLOADS ----------------------------- */
export function addDownload(userId: string | null, platform: string, url: string, title?: string, meta?: any) {
  return insert("downloads", {
    userId,
    platform,
    url,
    title: title || null,
    meta: meta ? JSON.stringify(meta) : null,
    createdAt: now(),
  });
}
export async function listDownloads(userId?: string, limit = 60) {
  if (userId) return dbAll("SELECT * FROM downloads WHERE userId = ? ORDER BY createdAt DESC LIMIT ?", [userId, limit]);
  return dbAll("SELECT * FROM downloads ORDER BY createdAt DESC LIMIT ?", [limit]);
}

/* ----------------------------- ACTIVITIES ---------------------------- */
export function addActivity(userId: string | null, action: string, detail?: string, points = 1) {
  return insert("activities", { userId, action, detail: detail || null, points, createdAt: now() });
}
export async function listActivities(userId?: string, limit = 100) {
  if (userId) return dbAll("SELECT * FROM activities WHERE userId = ? ORDER BY createdAt DESC LIMIT ?", [userId, limit]);
  return dbAll("SELECT * FROM activities ORDER BY createdAt DESC LIMIT ?", [limit]);
}

/* ------------------------------ API KEYS ----------------------------- */
export function createApiKey(userId: string, name: string, keyHash: string, prefix: string) {
  return insert("api_keys", { userId, name, keyHash, prefix, requests: 0, revoked: 0, createdAt: now() });
}
export async function listApiKeys(userId: string) {
  return dbAll("SELECT * FROM api_keys WHERE userId = ? ORDER BY createdAt DESC", [userId]);
}
export async function findApiKey(hash: string) {
  return (await dbGet("SELECT * FROM api_keys WHERE keyHash = ? AND revoked = 0", [hash])) as any;
}
export async function revokeApiKey(id: string, userId: string) {
  await dbRun("UPDATE api_keys SET revoked = 1 WHERE id = ? AND userId = ?", [id, userId]);
}
export async function touchApiKey(id: string) {
  await dbRun("UPDATE api_keys SET requests = requests + 1, lastUsedAt = ? WHERE id = ?", [now(), id]);
}

/* ------------------------------ USER KEYS ---------------------------- */
export async function setUserKey(userId: string, provider: string, secret: string) {
  const existing = (await dbGet("SELECT * FROM user_keys WHERE userId = ? AND provider = ?", [userId, provider])) as any;
  if (existing) {
    await dbRun("UPDATE user_keys SET secret = ? WHERE id = ?", [secret, existing.id]);
    return;
  }
  await insert("user_keys", { userId, provider, secret, createdAt: now() });
}
export async function getUserKey(userId: string, provider: string) {
  return (await dbGet("SELECT * FROM user_keys WHERE userId = ? AND provider = ?", [userId, provider])) as any;
}
export async function listUserKeys(userId: string) {
  return dbAll("SELECT id, provider, createdAt FROM user_keys WHERE userId = ?", [userId]);
}
export async function deleteUserKey(userId: string, provider: string) {
  await dbRun("DELETE FROM user_keys WHERE userId = ? AND provider = ?", [userId, provider]);
}

/* ------------------------------ COUNTERS ----------------------------- */
export async function bumpCounter(key: string, amount = 1) {
  const row = (await dbGet("SELECT * FROM counters WHERE key = ?", [key])) as any;
  if (row) {
    await dbRun("UPDATE counters SET value = value + ? WHERE key = ?", [amount, key]);
    return row.value + amount;
  }
  await dbRun("INSERT INTO counters (key, value) VALUES (?, ?)", [key, amount]);
  return amount;
}
export async function getCounter(key: string) {
  const row = (await dbGet("SELECT * FROM counters WHERE key = ?", [key])) as any;
  return Number(row?.value || 0);
}
export async function allCounters() {
  return dbAll("SELECT * FROM counters");
}

/* ---------------------------- SHORT LINKS ---------------------------- */
export async function createShortLink(url: string, userId?: string | null, code?: string) {
  const c = code || newId().slice(0, 7);
  const exists = await dbGet("SELECT * FROM short_links WHERE code = ?", [c]);
  if (exists) return createShortLink(url, userId);
  return insert("short_links", { code: c, url, clicks: 0, userId: userId || null, createdAt: now() });
}
export async function getShortLink(code: string) {
  return (await dbGet("SELECT * FROM short_links WHERE code = ?", [code])) as any;
}
export async function bumpShortLink(code: string) {
  await dbRun("UPDATE short_links SET clicks = clicks + 1 WHERE code = ?", [code]);
}
export async function listShortLinks(userId?: string) {
  if (userId) return dbAll("SELECT * FROM short_links WHERE userId = ? ORDER BY createdAt DESC LIMIT 50", [userId]);
  return dbAll("SELECT * FROM short_links ORDER BY createdAt DESC LIMIT 50");
}
