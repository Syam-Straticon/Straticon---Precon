// Storage driver for Straticon Pre-Con.
// - Local (npm start): the existing file layout (.users.json, .chats/, …) — nothing moves.
// - Vercel: set POSTGRES_URL (Vercel Postgres / Neon) and everything lives in two tables:
//     docs(col, id, data jsonb)  — users, sessions, projects, chats, bids, gendocs, sheet metadata, fills
//     bins(col, id, data bytea)  — scope-sheet workbooks, fill template bytes
// Vercel's filesystem is read-only and per-invocation, so files can't persist there.
import fs from 'fs';
import path from 'path';
import type { Pool } from 'pg';

export const usingPg = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
const ROOT = __dirname;

let pool: Pool | null = null;
let ready: Promise<void> | null = null;
async function pg(): Promise<Pool> {
  if (!pool) {
    const { Pool: PgPool } = await import('pg');
    pool = new PgPool({ connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
      ssl: /localhost|127\.0\.0\.1/.test(process.env.POSTGRES_URL || process.env.DATABASE_URL || '') ? undefined : { rejectUnauthorized: false },
      max: 3 });
  }
  if (!ready) {
    ready = (async () => {
      await pool!.query(`CREATE TABLE IF NOT EXISTS docs (col text NOT NULL, id text NOT NULL, data jsonb NOT NULL, PRIMARY KEY (col, id))`);
      await pool!.query(`CREATE TABLE IF NOT EXISTS bins (col text NOT NULL, id text NOT NULL, data bytea NOT NULL, PRIMARY KEY (col, id))`);
    })();
  }
  await ready;
  return pool!;
}

// ---- file-driver locations that preserve the existing on-disk layout ----
const DIR_COLS: Record<string, { dir: string; ext: string }> = {
  chats: { dir: '.chats', ext: '.json' },
  bids: { dir: '.bidrecords', ext: '.json' },
  gendocs: { dir: '.gendocs', ext: '.json' },
  sheets: { dir: '.scopesheets', ext: '.json' },
  fills: { dir: '.fills', ext: '.json' }
};
const BIN_COLS: Record<string, { dir: string; ext: string }> = {
  sheets: { dir: '.scopesheets', ext: '.xlsx' },
  fills: { dir: '.fills', ext: '.bin' }
};
const KV_FILES: Record<string, string> = { users: '.users.json', projects: '.projects.json' };
function dirFor(map: Record<string, { dir: string; ext: string }>, col: string, id: string): string {
  const m = map[col];
  if (!m) throw new Error('Unknown collection: ' + col);
  if (!/^[0-9A-Za-z_-]{1,64}$/.test(id)) throw new Error('Bad id');
  const d = path.join(ROOT, m.dir);
  fs.mkdirSync(d, { recursive: true });
  return path.join(d, id + m.ext);
}

// ---- whole-value KV (users array, projects array) ----
export async function kvGet<T>(name: string): Promise<T | null> {
  if (usingPg) {
    const r = await (await pg()).query('SELECT data FROM docs WHERE col=$1 AND id=$2', ['kv', name]);
    return r.rows[0] ? (r.rows[0].data as T) : null;
  }
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, KV_FILES[name]), 'utf8')) as T; } catch { return null; }
}
export async function kvSet(name: string, value: unknown): Promise<void> {
  if (usingPg) {
    await (await pg()).query(
      'INSERT INTO docs (col, id, data) VALUES ($1,$2,$3) ON CONFLICT (col,id) DO UPDATE SET data=EXCLUDED.data',
      ['kv', name, JSON.stringify(value)]);
    return;
  }
  fs.writeFileSync(path.join(ROOT, KV_FILES[name]), JSON.stringify(value, null, 1), { mode: 0o600 });
}

// ---- per-row documents (sessions, chats, bids, gendocs, sheet metadata, fill metadata) ----
export async function docGet<T>(col: string, id: string): Promise<T | null> {
  if (usingPg) {
    const r = await (await pg()).query('SELECT data FROM docs WHERE col=$1 AND id=$2', [col, id]);
    return r.rows[0] ? (r.rows[0].data as T) : null;
  }
  try { return JSON.parse(fs.readFileSync(dirFor(DIR_COLS, col, id), 'utf8')) as T; } catch { return null; }
}
export async function docPut(col: string, id: string, value: unknown): Promise<void> {
  if (usingPg) {
    await (await pg()).query(
      'INSERT INTO docs (col, id, data) VALUES ($1,$2,$3) ON CONFLICT (col,id) DO UPDATE SET data=EXCLUDED.data',
      [col, id, JSON.stringify(value)]);
    return;
  }
  fs.writeFileSync(dirFor(DIR_COLS, col, id), JSON.stringify(value));
}
export async function docDel(col: string, id: string): Promise<boolean> {
  if (usingPg) {
    const r = await (await pg()).query('DELETE FROM docs WHERE col=$1 AND id=$2', [col, id]);
    return (r.rowCount ?? 0) > 0;
  }
  try { fs.unlinkSync(dirFor(DIR_COLS, col, id)); return true; } catch { return false; }
}
export async function docAll<T>(col: string): Promise<T[]> {
  if (usingPg) {
    const r = await (await pg()).query('SELECT data FROM docs WHERE col=$1', [col]);
    return r.rows.map(x => x.data as T);
  }
  const m = DIR_COLS[col];
  const d = path.join(ROOT, m.dir);
  try {
    return fs.readdirSync(d).filter(f => f.endsWith(m.ext)).flatMap(f => {
      try { return [JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')) as T]; } catch { return []; }
    });
  } catch { return []; }
}

// ---- binary blobs (scope-sheet workbooks, fill template bytes) ----
export async function binGet(col: string, id: string): Promise<Buffer | null> {
  if (usingPg) {
    const r = await (await pg()).query('SELECT data FROM bins WHERE col=$1 AND id=$2', [col, id]);
    return r.rows[0] ? Buffer.from(r.rows[0].data) : null;
  }
  try { return fs.readFileSync(dirFor(BIN_COLS, col, id)); } catch { return null; }
}
export async function binPut(col: string, id: string, buf: Buffer): Promise<void> {
  if (usingPg) {
    await (await pg()).query(
      'INSERT INTO bins (col, id, data) VALUES ($1,$2,$3) ON CONFLICT (col,id) DO UPDATE SET data=EXCLUDED.data',
      [col, id, buf]);
    return;
  }
  fs.writeFileSync(dirFor(BIN_COLS, col, id), new Uint8Array(buf));
}
export async function binDel(col: string, id: string): Promise<void> {
  if (usingPg) { await (await pg()).query('DELETE FROM bins WHERE col=$1 AND id=$2', [col, id]); return; }
  try { fs.unlinkSync(dirFor(BIN_COLS, col, id)); } catch { /* gone */ }
}

// ---- sessions: per-key for serverless correctness; the file driver keeps .sessions.json ----
type Sess = { userId: string; exp: number };
const SESSIONS_FILE = path.join(ROOT, '.sessions.json');
let fileSessions: Map<string, Sess> | null = null;
function loadFileSessions(): Map<string, Sess> {
  if (!fileSessions) {
    try { fileSessions = new Map(Object.entries(JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8')))); }
    catch { fileSessions = new Map(); }
  }
  return fileSessions;
}
function saveFileSessions() {
  try { fs.writeFileSync(SESSIONS_FILE, JSON.stringify(Object.fromEntries(loadFileSessions())), { mode: 0o600 }); } catch { /* best effort */ }
}
export async function sessGet(sid: string): Promise<Sess | null> {
  if (usingPg) return docGet<Sess>('sessions', sid);
  return loadFileSessions().get(sid) ?? null;
}
export async function sessSet(sid: string, s: Sess): Promise<void> {
  if (usingPg) { await docPut('sessions', sid, s); return; }
  loadFileSessions().set(sid, s); saveFileSessions();
}
export async function sessDel(sid: string): Promise<void> {
  if (usingPg) { await docDel('sessions', sid); return; }
  loadFileSessions().delete(sid); saveFileSessions();
}
export async function sessDelByUser(userId: string): Promise<void> {
  if (usingPg) {
    await (await pg()).query(`DELETE FROM docs WHERE col='sessions' AND data->>'userId'=$1`, [userId]);
    return;
  }
  const m = loadFileSessions();
  for (const [sid, s] of m) if (s.userId === userId) m.delete(sid);
  saveFileSessions();
}
