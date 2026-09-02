/**
 * Database layer.
 *
 * Default: SQLite (better-sqlite3) - jalan tanpa setup apa pun.
 * Opsional: PostgreSQL - cukup set DATABASE_URL="postgres://user:pass@host:5432/db"
 *           dan semua query otomatis dialihkan ke driver `pg`.
 *
 * Semua query ditulis dengan placeholder `?` (style SQLite) dan
 * ditranslate ke `$1,$2,...` otomatis kalau pakai Postgres.
 */
import path from "path";
import fs from "fs";

export type Row = Record<string, any>;

export interface Driver {
  all(sql: string, params?: any[]): Promise<Row[]>;
  get(sql: string, params?: any[]): Promise<Row | undefined>;
  run(sql: string, params?: any[]): Promise<{ changes: number; lastId?: any }>;
  exec(sql: string): Promise<void>;
  kind: "sqlite" | "postgres";
}

function toPg(sql: string, params: any[] = []) {
  let i = 0;
  const out = sql.replace(/\?/g, () => `$${++i}`);
  return { sql: out, params };
}

/* ------------------------------- SQLite ------------------------------- */
class SqliteDriver implements Driver {
  kind = "sqlite" as const;
  private db: any;
  constructor(file: string) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require("better-sqlite3");
    const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    this.db = new Database(abs);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
  }
  async all(sql: string, params: any[] = []) {
    return this.db.prepare(sql).all(...params) as Row[];
  }
  async get(sql: string, params: any[] = []) {
    return this.db.prepare(sql).get(...params) as Row | undefined;
  }
  async run(sql: string, params: any[] = []) {
    const info = this.db.prepare(sql).run(...params);
    return { changes: info.changes, lastId: info.lastInsertRowid };
  }
  async exec(sql: string) {
    this.db.exec(sql);
  }
}

/* ------------------------------ Postgres ------------------------------ */
class PgDriver implements Driver {
  kind = "postgres" as const;
  private pool: any;
  constructor(url: string) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Pool } = require("pg");
    this.pool = new Pool({ connectionString: url, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
  }
  async all(sql: string, params: any[] = []) {
    const q = toPg(sql, params);
    const r = await this.pool.query(q.sql, q.params);
    return r.rows as Row[];
  }
  async get(sql: string, params: any[] = []) {
    const rows = await this.all(sql, params);
    return rows[0];
  }
  async run(sql: string, params: any[] = []) {
    const q = toPg(sql, params);
    const r = await this.pool.query(q.sql, q.params);
    return { changes: r.rowCount || 0, lastId: r.rows?.[0]?.id };
  }
  async exec(sql: string) {
    const stmts = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const s of stmts) await this.pool.query(s);
  }
}

/* ------------------------------ Bootstrap ----------------------------- */
const SCHEMA_SQLITE = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  passwordHash TEXT,
  image TEXT,
  bio TEXT,
  role TEXT DEFAULT 'USER',
  plan TEXT DEFAULT 'FREE',
  dailyRequests INTEGER DEFAULT 0,
  totalRequests INTEGER DEFAULT 0,
  requestResetAt TEXT,
  stripeCustomerId TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS chat_threads (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  title TEXT DEFAULT 'Percakapan baru',
  model TEXT DEFAULT 'llama-3.3-70b-versatile',
  pinned INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  threadId TEXT NOT NULL,
  userId TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  model TEXT,
  meta TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  userId TEXT,
  type TEXT,
  prompt TEXT,
  resultUrl TEXT,
  meta TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS downloads (
  id TEXT PRIMARY KEY,
  userId TEXT,
  platform TEXT,
  url TEXT,
  title TEXT,
  meta TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  userId TEXT,
  action TEXT,
  detail TEXT,
  points INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  userId TEXT,
  name TEXT,
  keyHash TEXT,
  prefix TEXT,
  lastUsedAt TEXT,
  requests INTEGER DEFAULT 0,
  revoked INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS user_keys (
  id TEXT PRIMARY KEY,
  userId TEXT,
  provider TEXT,
  secret TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  UNIQUE(userId, provider)
);
CREATE TABLE IF NOT EXISTS short_links (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE,
  url TEXT,
  clicks INTEGER DEFAULT 0,
  userId TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS counters (
  key TEXT PRIMARY KEY,
  value INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_threads_user ON chat_threads(userId);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON chat_messages(threadId);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activities(userId);
CREATE INDEX IF NOT EXISTS idx_generations_user ON generations(userId);
`;

const SCHEMA_PG = SCHEMA_SQLITE.replace(/datetime\('now'\)/g, "now()")
  .replace(/TEXT DEFAULT \(now\(\)\)/g, "TIMESTAMPTZ DEFAULT now()")
  .replace(/ INTEGER DEFAULT (\d+)/g, " INTEGER DEFAULT $1");

let driverPromise: Promise<Driver> | null = null;

export function getDriver(): Promise<Driver> {
  if (!driverPromise) {
    driverPromise = (async () => {
      const url = process.env.DATABASE_URL || "file:./data/neural.db";
      let d: Driver;
      if (url.startsWith("postgres")) {
        d = new PgDriver(url);
      } else {
        d = new SqliteDriver(url.replace(/^file:/, "").replace(/^\.\//, ""));
      }
      try {
        await d.exec(d.kind === "postgres" ? SCHEMA_PG : SCHEMA_SQLITE);
      } catch (e) {
        console.error("[db] schema init error", e);
      }
      return d;
    })();
  }
  return driverPromise;
}

export async function dbAll(sql: string, params: any[] = []) {
  const d = await getDriver();
  return d.all(sql, params);
}
export async function dbGet(sql: string, params: any[] = []) {
  const d = await getDriver();
  return d.get(sql, params);
}
export async function dbRun(sql: string, params: any[] = []) {
  const d = await getDriver();
  return d.run(sql, params);
}
export async function dbExec(sql: string) {
  const d = await getDriver();
  return d.exec(sql);
}

/** Helper "INSERT" yang nerima object & balikin baris yang dibuat. */
export async function insert<T = Row>(table: string, data: Row): Promise<T> {
  const id = data.id || newId();
  const row = { ...data, id };
  const keys = Object.keys(row);
  const ph = keys.map(() => "?").join(",");
  await dbRun(`INSERT INTO ${table} (${keys.join(",")}) VALUES (${ph})`, keys.map((k) => row[k]));
  const created = await dbGet(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  return created as T;
}

export async function update(table: string, id: string, data: Row) {
  const keys = Object.keys(data).filter((k) => k !== "id");
  if (!keys.length) return;
  await dbRun(`UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(",")} WHERE id = ?`, [
    ...keys.map((k) => data[k]),
    id,
  ]);
}

export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Konversi boolean -> 0/1 biar aman di SQLite & Postgres. */
export function b(v: boolean) {
  return v ? 1 : 0;
}
