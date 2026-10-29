// Straticon Pre-Construction backend (TypeScript)
// Serves the UI, proxies Claude (Mason) and Autodesk APS. Keys live in .env, never in the browser.
import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import express, { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

type Role = 'user' | 'assistant';
interface ChatMessage { role: Role; content: string | ContentBlock[] }
interface AttachedDoc { name: string; text: string }
interface ContentBlock {
  type: string; text?: string;
  id?: string; name?: string; input?: Record<string, string | boolean>; // tool_use
  tool_use_id?: string; content?: string; is_error?: boolean;           // tool_result
  source?: { type: string; media_type?: string; data?: string };        // document (visual PDF reading)
  title?: string;
}
interface AttachedImage { name: string; media_type: string; data: string } // base64, png/jpeg/gif/webp
interface ChatRequest { messages: ChatMessage[]; project?: string | null; docs?: AttachedDoc[]; images?: AttachedImage[] }
interface ClaudeResponse { content?: ContentBlock[]; stop_reason?: string; error?: { message: string } }
interface ApsTokenResponse { access_token: string; expires_in: number; error?: string; errorDescription?: string }

const app = express();
app.use(express.json({ limit: '60mb' })); // attached photos ride in the chat payload as base64
app.use(express.static(__dirname)); // serves index.html (the login screen lives in the page itself)

// ---------- Accounts & sessions: @straticon.com only, scrypt-hashed passwords, per-project access ----------
const USERS_FILE = path.join(__dirname, '.users.json');
const SESSIONS_FILE = path.join(__dirname, '.sessions.json');
const EMAIL_DOMAIN = '@straticon.com';
const SESSION_TTL = 7 * 24 * 3600_000; // 7 days

interface UserRec {
  id: string; email: string; name: string; role: 'admin' | 'member';
  hash: string; salt: string; mustChangePassword: boolean;
  projectIds: string[] | '*'; // '*' = all projects
  createdAt: string;
}
function loadUsers(): UserRec[] { try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) as UserRec[]; } catch { return []; } }
function saveUsers(u: UserRec[]) { fs.writeFileSync(USERS_FILE, JSON.stringify(u, null, 1), { mode: 0o600 }); }
function hashPassword(pw: string, salt: string): string {
  return crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
}
function checkPassword(u: UserRec, pw: string): boolean {
  const h = Buffer.from(hashPassword(pw, u.salt), 'hex');
  const s = Buffer.from(u.hash, 'hex');
  return h.length === s.length && crypto.timingSafeEqual(h, s);
}
function validEmail(e: string): boolean {
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+$/i.test(e) && e.toLowerCase().endsWith(EMAIL_DOMAIN);
}

let sessions = new Map<string, { userId: string; exp: number }>();
try { sessions = new Map(Object.entries(JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8')))); } catch { /* fresh */ }
function saveSessions() {
  try { fs.writeFileSync(SESSIONS_FILE, JSON.stringify(Object.fromEntries(sessions)), { mode: 0o600 }); } catch { /* best effort */ }
}
function cookieSid(req: Request): string | null {
  const m = /(?:^|;\s*)sid=([a-f0-9]{64})/.exec(req.headers.cookie || '');
  return m ? m[1] : null;
}
function sessionUser(req: Request): UserRec | null {
  const sid = cookieSid(req);
  if (!sid) return null;
  const s = sessions.get(sid);
  if (!s || s.exp < Date.now()) { if (s) { sessions.delete(sid); saveSessions(); } return null; }
  return loadUsers().find(u => u.id === s.userId) ?? null;
}
function startSession(res: Response, userId: string) {
  const sid = crypto.randomBytes(32).toString('hex');
  sessions.set(sid, { userId, exp: Date.now() + SESSION_TTL });
  saveSessions();
  res.setHeader('Set-Cookie', `sid=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL / 1000}`);
}
// Brute-force damper: 5 tries, then a 10-minute cool-off per email
const loginFails = new Map<string, { n: number; until: number }>();

const PUBLIC_API = /^\/api\/auth\/(login|setup|me)$/;
app.use((req: Request, res: Response, next: () => void) => {
  if (!req.path.startsWith('/api/') || PUBLIC_API.test(req.path)) { next(); return; }
  const u = sessionUser(req);
  if (!u) { res.status(401).json({ error: 'Not signed in' }); return; }
  (req as Request & { user?: UserRec }).user = u;
  next();
});
const reqUser = (req: Request): UserRec => (req as Request & { user: UserRec }).user;
function canAccess(u: UserRec, projectName: string): boolean {
  if (u.role === 'admin' || u.projectIds === '*') return true;
  const p = loadProjects().find(x => x.name === projectName);
  return !!p && u.projectIds.includes(p.id);
}

// Who am I (also tells the login screen whether first-run setup is needed)
app.get('/api/auth/me', (req: Request, res: Response) => {
  const u = sessionUser(req);
  if (!u) { res.json({ user: null, needsSetup: loadUsers().length === 0 }); return; }
  res.json({ user: { id: u.id, email: u.email, name: u.name, role: u.role, mustChangePassword: u.mustChangePassword } });
});
// First run: create the founding admin (only while no users exist)
app.post('/api/auth/setup', (req: Request, res: Response) => {
  if (loadUsers().length) { res.status(403).json({ error: 'Already set up' }); return; }
  const { email, name, password } = req.body as { email: string; name: string; password: string };
  if (!validEmail(email || '')) { res.status(400).json({ error: `Use your ${EMAIL_DOMAIN} email` }); return; }
  if (!password || password.length < 10) { res.status(400).json({ error: 'Password must be at least 10 characters' }); return; }
  const salt = crypto.randomBytes(16).toString('hex');
  const u: UserRec = { id: crypto.randomUUID(), email: email.toLowerCase(), name: (name || email).trim(), role: 'admin',
    hash: hashPassword(password, salt), salt, mustChangePassword: false, projectIds: '*', createdAt: new Date().toISOString() };
  saveUsers([u]); startSession(res, u.id);
  res.json({ ok: true });
});
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const key = (email || '').toLowerCase();
  const fail = loginFails.get(key);
  if (fail && fail.until > Date.now()) { res.status(429).json({ error: 'Too many attempts — try again in a few minutes' }); return; }
  const u = loadUsers().find(x => x.email === key);
  if (!u || !checkPassword(u, password || '')) {
    const n = (fail?.n ?? 0) + 1;
    loginFails.set(key, { n, until: n >= 5 ? Date.now() + 10 * 60_000 : 0 });
    res.status(401).json({ error: 'Wrong email or password' }); return;
  }
  loginFails.delete(key);
  startSession(res, u.id);
  res.json({ ok: true, mustChangePassword: u.mustChangePassword });
});
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const sid = cookieSid(req);
  if (sid) { sessions.delete(sid); saveSessions(); }
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  res.json({ ok: true });
});
app.post('/api/auth/change-password', (req: Request, res: Response) => {
  const u = reqUser(req);
  const { current, next: nextPw } = req.body as { current: string; next: string };
  const all = loadUsers(); const me = all.find(x => x.id === u.id)!;
  if (!me.mustChangePassword && !checkPassword(me, current || '')) { res.status(401).json({ error: 'Current password is wrong' }); return; }
  if (me.mustChangePassword && current && !checkPassword(me, current)) { res.status(401).json({ error: 'Current password is wrong' }); return; }
  if (!nextPw || nextPw.length < 10) { res.status(400).json({ error: 'New password must be at least 10 characters' }); return; }
  me.salt = crypto.randomBytes(16).toString('hex');
  me.hash = hashPassword(nextPw, me.salt);
  me.mustChangePassword = false;
  saveUsers(all);
  res.json({ ok: true });
});
app.post('/api/auth/profile', (req: Request, res: Response) => {
  const u = reqUser(req);
  const { name } = req.body as { name?: string };
  const all = loadUsers(); const me = all.find(x => x.id === u.id)!;
  if (name?.trim()) me.name = name.trim().slice(0, 80);
  saveUsers(all);
  res.json({ ok: true, name: me.name });
});

// ---- Admin: manage who gets in and which projects they see ----
function requireAdmin(req: Request, res: Response): boolean {
  if (reqUser(req).role !== 'admin') { res.status(403).json({ error: 'Admins only' }); return false; }
  return true;
}
app.get('/api/users', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  res.json({ users: loadUsers().map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, projectIds: u.projectIds, mustChangePassword: u.mustChangePassword })) });
});
app.post('/api/users', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id, email, name, role, projectIds, resetPassword } = req.body as
    { id?: string; email?: string; name?: string; role?: 'admin' | 'member'; projectIds?: string[] | '*'; resetPassword?: boolean };
  const all = loadUsers();
  let u = id ? all.find(x => x.id === id) : undefined;
  let tempPassword: string | undefined;
  if (!u) { // create: always with a temp password the admin hands over
    if (!validEmail(email || '')) { res.status(400).json({ error: `Only ${EMAIL_DOMAIN} emails can be added` }); return; }
    if (all.some(x => x.email === email!.toLowerCase())) { res.status(409).json({ error: 'That email already has an account' }); return; }
    tempPassword = crypto.randomBytes(8).toString('base64url');
    const salt = crypto.randomBytes(16).toString('hex');
    u = { id: crypto.randomUUID(), email: email!.toLowerCase(), name: (name || email!).trim(), role: role === 'admin' ? 'admin' : 'member',
      hash: hashPassword(tempPassword, salt), salt, mustChangePassword: true, projectIds: projectIds ?? [], createdAt: new Date().toISOString() };
    all.push(u);
  } else {
    if (name !== undefined) u.name = String(name).trim().slice(0, 80);
    if (role !== undefined && u.id !== reqUser(req).id) u.role = role === 'admin' ? 'admin' : 'member'; // can't demote yourself
    if (projectIds !== undefined) u.projectIds = projectIds === '*' ? '*' : projectIds.slice(0, 100);
    if (resetPassword) {
      tempPassword = crypto.randomBytes(8).toString('base64url');
      u.salt = crypto.randomBytes(16).toString('hex');
      u.hash = hashPassword(tempPassword, u.salt);
      u.mustChangePassword = true;
    }
  }
  saveUsers(all);
  res.json({ id: u.id, email: u.email, tempPassword });
});
app.delete('/api/users/:id', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  if (req.params.id === reqUser(req).id) { res.status(400).json({ error: "You can't delete your own account" }); return; }
  const all = loadUsers();
  const i = all.findIndex(x => x.id === req.params.id);
  if (i < 0) { res.status(404).json({ error: 'User not found' }); return; }
  all.splice(i, 1); saveUsers(all);
  for (const [sid, s] of sessions) if (s.userId === req.params.id) sessions.delete(sid);
  saveSessions();
  res.json({ ok: true });
});



// ---------- Mason's system prompt: the master schema grounds every answer ----------
let schema = '';
try {
  schema = fs.readFileSync(path.join(__dirname, 'docs', 'preconstruction-master-schema.md'), 'utf8');
} catch { console.warn('Master schema not found — Mason runs without it.'); }

const SYSTEM = `You are Straticon ai, Straticon's preconstruction agent, assisting the Director of Preconstruction and his team.

Core rules (non-negotiable):
- Every extracted item carries an evidence tag: documented fact | bidder assumption | reasonable inference | requires clarification.
- Every claim cites its source: sheet number, spec section, proposal page/line, or email language.
- When two documents conflict, surface BOTH; never silently pick one.
- Track supersession: which revision/source replaces which, with dates.
- Owner-facing vs Straticon-internal content is kept separate; internal notes, buyout strategy and credentials never go into deliverables.
- Exhibit entries: 1-3 sentences, plain construction language, no legalese; flag risk-allocating lines for legal review.
- Leveling formula: Adjusted Bid = Base + Missing Scope + Required Allowances + Known Additions - Duplicated Scope.
- Never hard-code contract structure; it is per-project (A104 + Exhibits vs A102/A201 Early Works + GMP Amendment).

Your knowledge base — Straticon's master extraction schema, distilled from seven live projects:

${schema}`;

// ---------- Straticon ai's file tools: search & read documents in the ACTIVE project only ----------
// The project name → SharePoint site binding happens server-side, so the model can never cross projects.
interface SiteInfo { siteId: string; siteName: string; drives: { id: string; name: string }[] }
const siteCache = new Map<string, SiteInfo>(); // key: project name (lowercased)

async function resolveProjectSite(project: string): Promise<SiteInfo> {
  const key = project.toLowerCase();
  const hit = siteCache.get(key);
  if (hit) return hit;
  // Graph site search requires every term to match, so drop trailing words until something matches
  // (project "Rio Marine Village" ↔ site "Rio Marine").
  const words = project.split(/\s+/);
  let sites: { id: string; displayName: string }[] = [];
  for (let n = words.length; n >= 1 && !sites.length; n--) {
    const found = await graph(`/sites?search=${encodeURIComponent(words.slice(0, n).join(' '))}&$select=id,displayName`) as
      { value?: { id: string; displayName: string }[] };
    sites = found.value ?? [];
  }
  const site =
    sites.find(s => s.displayName.toLowerCase() === key) ??
    sites.find(s => s.displayName.toLowerCase().startsWith(key)) ??
    sites.find(s => s.displayName.toLowerCase().includes(key)) ??
    // Reverse containment: the site's name is a prefix of the project name
    sites.find(s => key.startsWith(s.displayName.toLowerCase())) ??
    // A lone search result only counts if it starts with the project's first word —
    // otherwise "Marina Mile" would bind to "Atlantic Point Marina … Bank Documents".
    (sites.length === 1 && sites[0].displayName.toLowerCase().startsWith(words[0].toLowerCase()) ? sites[0] : undefined);
  if (!site) {
    throw new Error(`No SharePoint site matches project "${project}".` +
      (sites.length ? ` Near names: ${sites.map(s => s.displayName).join(', ')}.` : ''));
  }
  const dr = await graph(`/sites/${site.id}/drives?$select=id,name`) as { value?: { id: string; name: string }[] };
  const info = { siteId: site.id, siteName: site.displayName, drives: dr.value ?? [] };
  siteCache.set(key, info);
  return info;
}

interface FileHit { driveId: string; itemId: string; name: string; path: string; size?: number }

async function searchProjectFiles(project: string, query: string): Promise<FileHit[]> {
  const site = await resolveProjectSite(project);
  // Search every drive of the site concurrently
  const perDrive = await Promise.all(site.drives.map(async d => {
    const r = await graph(`/drives/${d.id}/root/search(q='${encodeURIComponent(query.replace(/'/g, "''"))}')` +
      `?$select=id,name,size,file,folder,parentReference&$top=25`) as {
      value?: { id: string; name: string; size?: number; folder?: unknown; parentReference?: { path?: string } }[]
    };
    return (r.value ?? []).filter(it => !it.folder).map(it => {
      const p = (it.parentReference?.path ?? '').replace(/^\/drives\/[^/]+\/root:?/, '') || '/';
      return { driveId: d.id, itemId: it.id, name: it.name, path: `${d.name}${p}`, size: it.size };
    });
  }));
  return perDrive.flat().slice(0, 40);
}

// ---------- ACC (Autodesk) project resolution & search, same per-project scoping ----------
interface AccProjectInfo { hubId: string; projectId: string; projectName: string; topFolders: { id: string; name: string }[] }
const accCache = new Map<string, AccProjectInfo>(); // key: project name (lowercased)

async function resolveAccProject(project: string): Promise<AccProjectInfo> {
  const key = project.toLowerCase();
  const hit = accCache.get(key);
  if (hit) return hit;
  const hubs = await aps('/project/v1/hubs') as { data?: { id: string }[] };
  const candidates: { hubId: string; id: string; name: string }[] = [];
  for (const h of hubs.data ?? []) {
    const pr = await aps(`/project/v1/hubs/${h.id}/projects`) as { data?: { id: string; attributes?: { name?: string } }[] };
    for (const p of pr.data ?? []) candidates.push({ hubId: h.id, id: p.id, name: p.attributes?.name ?? '' });
  }
  const m =
    candidates.find(c => c.name.toLowerCase() === key) ??
    candidates.find(c => c.name.toLowerCase().startsWith(key)) ??
    candidates.find(c => c.name.toLowerCase().includes(key));
  if (!m) throw new Error(`No ACC project matches "${project}". This project's drawings/models may not be in ACC.`);
  const tf = await aps(`/project/v1/hubs/${m.hubId}/projects/${encodeURIComponent(m.id)}/topFolders`) as
    { data?: { id: string; attributes?: { displayName?: string } }[] };
  const info = {
    hubId: m.hubId, projectId: m.id, projectName: m.name,
    topFolders: (tf.data ?? []).map(f => ({ id: f.id, name: f.attributes?.displayName ?? '' }))
  };
  accCache.set(key, info);
  return info;
}

interface AccHit { versionId: string; name: string; size?: number }

// The search endpoint's displayName filters silently match nothing, but an UNFILTERED search returns the
// whole Project Files subtree recursively (paginated). So: index the project once, filter locally, cache.
const accIndexCache = new Map<string, { at: number; files: AccHit[] }>();
const accIndexBuilding = new Map<string, Promise<AccHit[]>>(); // dedupe concurrent builds (prewarm + tool call)
const ACC_INDEX_TTL = 30 * 60_000;
const accIndexFile = (key: string) => path.join(CACHE_DIR, 'accidx_' + crypto.createHash('sha256').update(key).digest('hex') + '.json');

async function accFileIndex(project: string): Promise<AccHit[]> {
  const key = project.toLowerCase();
  const hit = accIndexCache.get(key);
  if (hit && Date.now() - hit.at < ACC_INDEX_TTL) return hit.files;
  // Disk cache: survives server restarts, so the first question after a restart isn't slow again
  try {
    const disk = JSON.parse(fs.readFileSync(accIndexFile(key), 'utf8')) as { at: number; files: AccHit[] };
    if (Date.now() - disk.at < ACC_INDEX_TTL) { accIndexCache.set(key, disk); return disk.files; }
  } catch { /* no disk cache */ }
  const inflight = accIndexBuilding.get(key);
  if (inflight) return inflight;
  const build = buildAccFileIndex(project, key).finally(() => accIndexBuilding.delete(key));
  accIndexBuilding.set(key, build);
  return build;
}

async function buildAccFileIndex(project: string, key: string): Promise<AccHit[]> {
  const acc = await resolveAccProject(project);
  const pf = acc.topFolders.find(f => f.name === 'Project Files') ?? acc.topFolders[0];
  if (!pf) throw new Error(`The ACC project "${acc.projectName}" has no document folders.`);

  // The search response's data[] entries ARE versions (version urn ids); included[] holds their items.
  // Keep only the newest version per item lineage.
  const tipByItem = new Map<string, { versionId: string; name: string; size?: number; vn: number }>();
  let url: string | null = `/data/v1/projects/${encodeURIComponent(acc.projectId)}/folders/${encodeURIComponent(pf.id)}/search?page[limit]=100`;
  for (let page = 0; url && page < 50; page++) {
    const r = await aps(url) as {
      data?: { id: string; attributes?: { displayName?: string; storageSize?: number; versionNumber?: number };
               relationships?: { item?: { data?: { id?: string } } } }[];
      links?: { next?: { href?: string } };
    };
    for (const v of r.data ?? []) {
      const itemId = v.relationships?.item?.data?.id ?? v.id;
      const vn = v.attributes?.versionNumber ?? 0;
      const prev = tipByItem.get(itemId);
      if (!prev || vn > prev.vn) {
        tipByItem.set(itemId, { versionId: v.id, name: v.attributes?.displayName ?? 'file', size: v.attributes?.storageSize, vn });
      }
    }
    const next = r.links?.next?.href;
    url = next ? next.replace('https://developer.api.autodesk.com', '') : null;
  }
  const files: AccHit[] = [...tipByItem.values()].map(({ versionId, name, size }) => ({ versionId, name, size }));
  const entry = { at: Date.now(), files };
  accIndexCache.set(key, entry);
  try { fs.writeFileSync(accIndexFile(key), JSON.stringify(entry)); } catch { /* cache write is best-effort */ }
  return files;
}

async function searchAccFiles(project: string, query: string): Promise<AccHit[]> {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const files = await accFileIndex(project);
  return files.filter(f => { const n = f.name.toLowerCase(); return terms.every(t => n.includes(t)); }).slice(0, 40);
}

const AGENT_TOOLS = [
  {
    name: 'search_project_files',
    description: 'Search the active project\'s SharePoint site (scope sheets, proposals, bid lists, logs, correspondence) for documents by name keyword (e.g. "waterproofing", "07 10 00", "bid list", a bidder name). Returns matching files with their folder path. Search BEFORE telling the user a document is missing. Prefer short keywords; try several spellings if the first search is empty.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Filename keyword(s) to search for' } },
      required: ['query']
    }
  },
  {
    name: 'read_project_file',
    description: 'Download a SharePoint file found via search_project_files and return its extracted text. Supports PDF, Excel (.xlsx/.xlsm/.xls), Word (.docx), Outlook email (.msg), txt, md, csv, json, log. Use the exact driveId and itemId from the search result. A scanned PDF with no text layer is automatically attached as a visual document instead; set visual=true to force that for a PDF whose layout matters (drawings, stamped forms, signed documents, tables that extract badly).',
    input_schema: {
      type: 'object',
      properties: {
        driveId: { type: 'string' }, itemId: { type: 'string' },
        name: { type: 'string', description: 'The file name, used to pick the text extractor' },
        visual: { type: 'boolean', description: 'PDFs only: attach the PDF itself for visual reading instead of extracting text' }
      },
      required: ['driveId', 'itemId', 'name']
    }
  },
  {
    name: 'search_acc_files',
    description: 'Search the active project\'s Autodesk ACC (BIM 360) files by file name — drawings, specs, exhibits, proposals, logs. ALL space-separated terms must appear in the file name (e.g. "Div 07 waterproofing", "S-1.2", "buyout log"). Returns matching files with versionId. Not every project has an ACC presence; if the tool says so, rely on SharePoint.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Filename keyword(s) to search for' } },
      required: ['query']
    }
  },
  {
    name: 'read_acc_file',
    description: 'Download an ACC file found via search_acc_files and return its extracted text. Supports PDF, Excel (.xlsx/.xlsm/.xls), Word (.docx), Outlook email (.msg), txt, md, csv, json, log — not RVT/DWG models. Use the exact versionId from the search result. A scanned PDF with no text layer is automatically attached as a visual document instead; set visual=true to force that for a PDF whose layout matters (drawing sheets, details, stamped forms).',
    input_schema: {
      type: 'object',
      properties: {
        versionId: { type: 'string' },
        visual: { type: 'boolean', description: 'PDFs only: attach the PDF itself for visual reading instead of extracting text' }
      },
      required: ['versionId']
    }
  }
];

// Attach a PDF to the conversation as a native document block so the model reads it visually
// (scanned pages, drawing sheets, stamps, signatures — things text extraction can't see).
const MAX_VISUAL_PDF_BYTES = 20 * 1024 * 1024; // base64 inflates 4/3; Anthropic request cap is 32 MB
function attachPdf(buf: Buffer, name: string, attachments: ContentBlock[]): string {
  if (!name.toLowerCase().endsWith('.pdf')) throw new Error(`Visual reading only works for PDFs — "${name}" is not one.`);
  if (buf.length > MAX_VISUAL_PDF_BYTES) {
    throw new Error(`"${name}" is ${(buf.length / 1048576).toFixed(0)} MB — too large to attach for visual reading (limit 20 MB).`);
  }
  attachments.push({
    type: 'document',
    source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') },
    title: name
  });
  return `"${name}" is attached as a PDF document (after these tool results) — read it visually.`;
}

// ---------- Generated documents: the model drafts a standalone file, shown as a download card ----------
const DOCS_DIR = path.join(__dirname, '.gendocs');
fs.mkdirSync(DOCS_DIR, { recursive: true });
interface GenDoc { title: string; markdown: string; project: string | null; at: number }
function genDocFile(id: string): string {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('Bad document id');
  return path.join(DOCS_DIR, id + '.json');
}
function saveGenDoc(title: string, markdown: string, project: string | null): string {
  const id = crypto.randomUUID();
  fs.writeFileSync(genDocFile(id), JSON.stringify({ title, markdown, project, at: Date.now() } as GenDoc));
  return id;
}
// Sweep documents older than 30 days at boot
try {
  const cut = Date.now() - 30 * 24 * 3600_000;
  for (const f of fs.readdirSync(DOCS_DIR)) {
    try { const d = JSON.parse(fs.readFileSync(path.join(DOCS_DIR, f), 'utf8')) as GenDoc; if (d.at < cut) fs.unlinkSync(path.join(DOCS_DIR, f)); } catch { /* skip */ }
  }
} catch { /* fresh */ }

// ---------- Bid Review Records: structured extraction saved per project, feeds the leveling builder ----------
const BIDS_DIR = path.join(__dirname, '.bidrecords');
fs.mkdirSync(BIDS_DIR, { recursive: true });
interface AdjLine { item: string; value: number }
interface BidRecord {
  id: string; project: string; trade: string; division: number | null; bidder: string; proposal_date: string;
  base_bid: number;
  missing_scope: AdjLine[]; required_allowances: AdjLine[]; known_additions: AdjLine[]; duplicated_scope: AdjLine[];
  inclusions: string[]; exclusions: string[]; qualifications: string[];
  alternates: { description: string; value: number; accepted?: string }[];
  bond: string; schedule: string; payment_terms: string; notes: string; sources: string[];
  createdAt: string;
}
function bidFile(id: string): string {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('Bad record id');
  return path.join(BIDS_DIR, id + '.json');
}
function loadBids(project?: string): BidRecord[] {
  try {
    return fs.readdirSync(BIDS_DIR).filter(f => f.endsWith('.json')).flatMap(f => {
      try {
        const r = JSON.parse(fs.readFileSync(path.join(BIDS_DIR, f), 'utf8')) as BidRecord;
        return !project || r.project === project ? [r] : [];
      } catch { return []; }
    }).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch { return []; }
}
const adjSum = (a: AdjLine[]) => a.reduce((s, x) => s + (Number(x.value) || 0), 0);
const adjustedBid = (r: BidRecord) =>
  (Number(r.base_bid) || 0) + adjSum(r.missing_scope) + adjSum(r.required_allowances) + adjSum(r.known_additions) - adjSum(r.duplicated_scope);

const BID_TOOL = {
  name: 'save_bid_record',
  description: 'Save a structured Bid Review Record after reviewing a subcontractor proposal or scope sheet. ALWAYS call this after extracting a bid review so the record feeds bid leveling. Use real numbers from the documents only; leave adjustment arrays empty rather than guessing values. duplicated_scope values are positive numbers (they are subtracted). Cite the files you used in sources.',
  input_schema: {
    type: 'object',
    properties: {
      trade: { type: 'string', description: 'Trade/package, e.g. "Div 07 Waterproofing"' },
      division: { type: 'number', description: 'CSI division number, e.g. 7' },
      bidder: { type: 'string' },
      proposal_date: { type: 'string', description: 'MM/DD/YY' },
      base_bid: { type: 'number' },
      missing_scope: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, value: { type: 'number' } }, required: ['item', 'value'] } },
      required_allowances: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, value: { type: 'number' } }, required: ['item', 'value'] } },
      known_additions: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, value: { type: 'number' } }, required: ['item', 'value'] } },
      duplicated_scope: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, value: { type: 'number' } }, required: ['item', 'value'] } },
      inclusions: { type: 'array', items: { type: 'string' } },
      exclusions: { type: 'array', items: { type: 'string' } },
      qualifications: { type: 'array', items: { type: 'string' } },
      alternates: { type: 'array', items: { type: 'object', properties: { description: { type: 'string' }, value: { type: 'number' }, accepted: { type: 'string' } }, required: ['description', 'value'] } },
      bond: { type: 'string' }, schedule: { type: 'string' }, payment_terms: { type: 'string' }, notes: { type: 'string' },
      sources: { type: 'array', items: { type: 'string' }, description: 'File names the record was extracted from' }
    },
    required: ['trade', 'bidder', 'base_bid']
  }
};

const DOC_TOOL = {
  name: 'create_document',
  description: 'Create a standalone, downloadable document (client letter, information request, report, summary). Use this whenever the user asks for a document, letter, file, or something to send/download. content must be ONLY the finished document itself in markdown — headings, paragraphs, bullets, tables — written formally and completely, with NO conversational text ("Here is…", "Let me know…"). After calling it, keep your chat reply to one or two sentences; the user downloads the document from a card.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Document title, e.g. "Client Information Request — Avery Cypress Creek"' },
      content: { type: 'string', description: 'The complete document in markdown. Document text only.' }
    },
    required: ['title', 'content']
  }
};

const AGENT_RULES = `
Documents: when the user asks for a downloadable document, a letter, a report or a file to send (to a client/owner or anyone), use the create_document tool with ONLY the finished document content — never paste the document into the chat reply, and never include chat commentary inside the document. The user gets a download card for Word/PDF.
Bid records: whenever you complete a bid review (a proposal or scope sheet analyzed for a bidder), ALSO call save_bid_record with the structured fields — numbers only from the documents, never invented. These records build the project's leveling sheets.
Document access: you have tools that search and read files in the ACTIVE project's SharePoint site (scope sheets, proposals, bid lists, logs) and its Autodesk ACC project (drawings, specs). If a document could be in either, search both.
- Tools run in PARALLEL: issue ALL independent calls in one turn — several search keywords at once, SharePoint and ACC together, and every file you intend to read in a single batch. Never search or read one at a time when you already know the next call.
- When you need a document (a scope sheet, a proposal, a spec section, drawings, a bid list), FIRST search for it and read it yourself. Only ask the user for a document after searches with several keyword variants came up empty — and then say exactly what you searched for.
- Never present document content you have not actually read via a tool or an attached document.
- The tools are hard-scoped to the active project; results can never come from another project. Still, cite every file you used by name and folder path.
- Large reads are truncated; say so if a truncation may hide relevant scope.
- PDFs can be read VISUALLY (visual=true on the read tools): the PDF itself is attached and you see the actual pages. Use it for drawing sheets, details, stamped/signed documents, and any PDF whose extracted text looks garbled or loses the table layout. Scanned PDFs fall back to visual reading automatically. Visual reads are expensive — prefer extracted text when it is adequate, and don't visually re-read a file already attached in this conversation.`;

let anthropic: Anthropic | null = null; // built lazily so a missing key errors per-request, not at boot

// ---------- /api/chat → Claude (SSE streaming + agentic file tools) ----------
app.post('/api/chat', async (req: Request, res: Response) => {
  // Server-sent events: the reply streams token by token; tool activity arrives as it happens.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  const send = (ev: Record<string, unknown>) => { res.write(`data: ${JSON.stringify(ev)}\n\n`); };
  // Stop button / closed tab: abort the in-flight model stream instead of burning tokens.
  // res 'close' (not req 'close'!) — req closes as soon as its body is read, long before the client leaves.
  let clientGone = false;
  let curStream: { abort?: () => void } | null = null;
  res.on('close', () => {
    if (!res.writableEnded) { clientGone = true; try { curStream?.abort?.(); } catch { /* already done */ } }
  });
  try {
    const { messages, project, docs, images } = req.body as ChatRequest;
    if (!process.env.ANTHROPIC_API_KEY) { send({ type: 'error', error: 'ANTHROPIC_API_KEY missing in .env' }); res.end(); return; }
    if (project && !canAccess(reqUser(req), project)) { send({ type: 'error', error: 'You don\'t have access to this project.' }); res.end(); return; }
    anthropic ??= new Anthropic();
    // Attached photos become image blocks on the latest user message so the model actually sees them
    if (images?.length) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.role === 'user' && typeof m.content === 'string') {
          m.content = [
            ...images.slice(0, 10).map(img => ({ type: 'image', source: { type: 'base64', media_type: img.media_type, data: img.data } } as ContentBlock)),
            { type: 'text', text: m.content }
          ];
          break;
        }
      }
    }

    let sys = SYSTEM + AGENT_RULES + (project
      ? `\n\nThe user is currently working in the project: ${project}. Scope your answers to it unless told otherwise.`
      : '\n\nNo project is selected, so the file tools are disabled. If you need project documents, ask the user to click "Work in this project" on a project first.');
    // Project knowledge (claude.ai-style): instructions + stored docs ground every chat in the project
    if (project) {
      const rec = loadProjects().find(p => p.name === project);
      if (rec?.instructions) sys += `\n\nPROJECT INSTRUCTIONS (set by the team for ${project} — follow them):\n${rec.instructions}`;
      // Folder uploads can hold up to 100 files, so cap what rides in the prompt (~150k tokens)
      let knBudget = 600_000;
      const omitted: string[] = [];
      for (const k of rec?.knowledge ?? []) {
        if (k.text.length <= knBudget) {
          sys += `\n\n--- PROJECT KNOWLEDGE: ${k.name} ---\n${k.text}\n--- END OF ${k.name} ---`;
          knBudget -= k.text.length;
        } else omitted.push(k.name);
      }
      if (omitted.length) sys += `\n\nNOTE: ${omitted.length} more knowledge file(s) did not fit in context: ${omitted.join(', ')}. If one is needed, find the original on SharePoint/ACC with the file tools.`;
    }
    for (const d of docs ?? []) {
      sys += `\n\n--- ATTACHED DOCUMENT: ${d.name} ---\n${d.text.slice(0, 150_000)}\n--- END OF ${d.name} ---`;
    }

    const convo: ChatMessage[] = [...messages];
    const actions: string[] = []; // human-readable log of what the agent did, shown in the UI
    // act returns the entry's index so a parallel tool call can update its own line safely
    const act = (s: string): number => { actions.push(s); send({ type: 'action', text: s }); return actions.length - 1; };
    const actUpdate = (i: number, s: string) => { actions[i] = s; send({ type: 'action_update', index: i, text: s }); };
    let reply = '';

    // Pre-warm the slow per-project lookups while the model does its first thinking pass
    if (project) {
      void resolveProjectSite(project).catch(() => {});
      void accFileIndex(project).catch(() => {});
    }

    for (let turn = 0; turn < 12; turn++) {
      const stream = anthropic.messages.stream({
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5',
        max_tokens: 16000,
        // Auto-cache the request prefix: each loop turn (and follow-up message) then re-reads the big
        // system prompt + conversation from cache instead of re-processing it — much faster and cheaper.
        cache_control: { type: 'ephemeral' },
        system: sys,
        messages: convo as unknown as Anthropic.MessageParam[],
        tools: (project ? [...AGENT_TOOLS, DOC_TOOL, BID_TOOL] : [DOC_TOOL]) as unknown as Anthropic.Tool[]
      });
      curStream = stream;
      stream.on('text', t => send({ type: 'delta', text: t }));
      const msg = await stream.finalMessage();
      curStream = null;
      if (clientGone) { res.end(); return; }
      console.log(`[chat] turn ${turn}: in=${msg.usage.input_tokens} cache_read=${msg.usage.cache_read_input_tokens} cache_write=${msg.usage.cache_creation_input_tokens} out=${msg.usage.output_tokens}`);

      const content = msg.content as unknown as ContentBlock[];
      reply = content.filter(c => c.type === 'text').map(c => c.text ?? '').join('\n');
      if (msg.stop_reason !== 'tool_use') break;
      send({ type: 'clear' }); // wipe any mid-turn streamed text; tools run next, the real answer comes later

      convo.push({ role: 'assistant', content });
      // Execute every tool call of this turn CONCURRENTLY — reads and searches don't depend on each other
      const toolBlocks = content.filter(b => b.type === 'tool_use' && b.id);
      const outcomes = await Promise.all(toolBlocks.map(async block => {
        const input = block.input ?? {};
        const atts: ContentBlock[] = []; // document blocks this call attaches (visual PDF reads)
        let result = ''; let isError = false;
        try {
          if (block.name === 'search_project_files') {
            act(`Searched files for “${input.query}”`);
            const hits = await searchProjectFiles(project!, String(input.query ?? ''));
            result = hits.length
              ? hits.map(h => `${h.name} — ${h.path} (${Math.round((h.size ?? 0) / 1024)} KB) [driveId=${h.driveId} itemId=${h.itemId}]`).join('\n')
              : 'No files matched. Try a shorter or different keyword.';
          } else if (block.name === 'read_project_file') {
            const name = String(input.name ?? 'file');
            if (input.visual === true) {
              act(`Read ${name} visually`);
              result = attachPdf(await sharepointBytes(String(input.driveId ?? ''), String(input.itemId ?? '')), name, atts);
            } else {
              const i = act(`Read ${name}`);
              try {
                const { text } = await sharepointText(String(input.driveId ?? ''), String(input.itemId ?? ''), name);
                result = text.length > 60_000 ? text.slice(0, 60_000) + '\n…[truncated at 60k chars]' : text;
              } catch (e) {
                // Scanned PDF (no text layer) → fall back to visual reading automatically
                if (!(e as Error).message.startsWith('EMPTY:') || !name.toLowerCase().endsWith('.pdf')) throw e;
                actUpdate(i, `Read ${name} visually (scanned)`);
                result = attachPdf(await sharepointBytes(String(input.driveId ?? ''), String(input.itemId ?? '')), name, atts);
              }
            }
          } else if (block.name === 'search_acc_files') {
            act(`Searched ACC for “${input.query}”`);
            const hits = await searchAccFiles(project!, String(input.query ?? ''));
            result = hits.length
              ? hits.map(h => `${h.name} (${Math.round((h.size ?? 0) / 1024)} KB) [versionId=${h.versionId}]`).join('\n')
              : 'No ACC files matched. Try fewer or different keywords (all terms must appear in the file name).';
          } else if (block.name === 'read_acc_file') {
            const acc = await resolveAccProject(project!);
            if (input.visual === true) {
              const { buf, name } = await autodeskBytes(acc.projectId, String(input.versionId ?? ''));
              act(`Read ${name} visually (ACC)`);
              result = attachPdf(buf, name, atts);
            } else {
              try {
                const { text, name } = await autodeskText(acc.projectId, String(input.versionId ?? ''));
                act(`Read ${name} (ACC)`);
                result = text.length > 60_000 ? text.slice(0, 60_000) + '\n…[truncated at 60k chars]' : text;
              } catch (e) {
                if (!(e as Error).message.startsWith('EMPTY:')) throw e;
                const { buf, name } = await autodeskBytes(acc.projectId, String(input.versionId ?? ''));
                act(`Read ${name} visually (ACC, scanned)`);
                result = attachPdf(buf, name, atts);
              }
            }
          } else if (block.name === 'save_bid_record') {
            const inp = input as unknown as Partial<BidRecord>;
            if (!project || !inp.bidder || !inp.trade || typeof inp.base_bid !== 'number') {
              result = 'Record not saved — bidder, trade and a numeric base_bid are required (and an active project).'; isError = true;
            } else {
              const rec: BidRecord = {
                id: crypto.randomUUID(), project, trade: String(inp.trade).slice(0, 120),
                division: typeof inp.division === 'number' ? inp.division : null,
                bidder: String(inp.bidder).slice(0, 120), proposal_date: String(inp.proposal_date ?? '').slice(0, 20),
                base_bid: Number(inp.base_bid) || 0,
                missing_scope: (inp.missing_scope ?? []).slice(0, 60), required_allowances: (inp.required_allowances ?? []).slice(0, 60),
                known_additions: (inp.known_additions ?? []).slice(0, 60), duplicated_scope: (inp.duplicated_scope ?? []).slice(0, 60),
                inclusions: (inp.inclusions ?? []).slice(0, 120).map(String), exclusions: (inp.exclusions ?? []).slice(0, 120).map(String),
                qualifications: (inp.qualifications ?? []).slice(0, 120).map(String),
                alternates: (inp.alternates ?? []).slice(0, 40),
                bond: String(inp.bond ?? ''), schedule: String(inp.schedule ?? ''), payment_terms: String(inp.payment_terms ?? ''),
                notes: String(inp.notes ?? '').slice(0, 4000), sources: (inp.sources ?? []).slice(0, 20).map(String),
                createdAt: new Date().toISOString()
              };
              fs.writeFileSync(bidFile(rec.id), JSON.stringify(rec, null, 1));
              act(`Saved bid record — ${rec.bidder} (${rec.trade})`);
              send({ type: 'bidrecord', id: rec.id, bidder: rec.bidder, trade: rec.trade, adjusted: adjustedBid(rec) });
              result = `Bid record saved (adjusted bid computes to ${adjustedBid(rec)}). It appears on the project page under Bid records & leveling. Keep your reply concise.`;
            }
          } else if (block.name === 'create_document') {
            const title = String(input.title ?? 'Document').slice(0, 120);
            const id = saveGenDoc(title, String(input.content ?? ''), project ?? null);
            act(`Drafted document “${title}”`);
            send({ type: 'document', docId: id, title });
            result = 'Document created — the user sees a download card for it. Keep your reply to one or two sentences; do not repeat the document.';
          } else {
            result = `Unknown tool: ${block.name}`; isError = true;
          }
        } catch (e) {
          result = (e as Error).message.replace(/^(UNSUPPORTED|EMPTY):/, ''); isError = true;
        }
        return { id: block.id!, result, isError, atts };
      }));
      const results: ContentBlock[] = outcomes.map(o =>
        ({ type: 'tool_result', tool_use_id: o.id, content: o.result, is_error: o.isError || undefined }));
      const attachments = outcomes.flatMap(o => o.atts);
      // tool_result blocks must come first in the user message; attached PDFs follow them
      convo.push({ role: 'user', content: [...results, ...attachments] });
    }

    send({ type: 'done', reply, actions });
    res.end();
  } catch (e) {
    if (clientGone) { try { res.end(); } catch { /* socket gone */ } return; } // user hit stop — not an error
    send({ type: 'error', error: (e as Error).message });
    res.end();
  }
});

// ---------- Local file extraction: the "Add Files & Photos" upload path ----------
// Raw bytes in, extracted text out — same pipeline as the SharePoint/ACC readers.
app.post('/api/extract', express.raw({ type: () => true, limit: '80mb' }), async (req: Request, res: Response) => {
  try {
    const name = String(req.query.name || 'file');
    const buf = req.body as Buffer;
    if (!buf?.length) { res.status(400).json({ error: 'No file bytes received' }); return; }
    const text = await extractText(name, buf);
    res.json({ text, name });
  } catch (e) {
    const msg = (e as Error).message;
    res.status(msg.startsWith('UNSUPPORTED:') ? 415 : msg.startsWith('EMPTY:') ? 422 : 500)
      .json({ error: msg.replace(/^(UNSUPPORTED|EMPTY):/, '') });
  }
});

// ---------- Projects (claude.ai-style): shared store with description, instructions, knowledge ----------
const PROJECTS_FILE = path.join(__dirname, '.projects.json');
interface ProjectRec { id: string; name: string; description: string; instructions: string; knowledge: { name: string; text: string }[]; createdBy?: string; createdAt: string; updatedAt: string }
const PROJECT_SEED: [string, string][] = [
  ['Seacoast', 'Early Works → GMP Amendment · Exhibits C.1–C.5 · leveling & buyout'],
  ['Manor Cypress Creek', 'GMP proposal · Related Development · 42 bid packages · multifamily'],
  ['Rio Marine Village', 'CM at risk · AIA A104 · Exhibits A–K · tariff list (Exh. K)'],
  ['Wilton Manor', 'Early Works demolition · Exhibits A.1–A.5 · Rev 2'],
  ['Marina Mile', 'Schema pending · awaiting project mapping'],
  ['Little River Phase 1-2A', 'HUD multifamily · SD → GMP · Q&A / Basis of Estimate · Davis-Bacon'],
  ['Avery Cypress Creek', 'Scope dispute · Div 26 · FPL vault credit · position memo'],
  ['Rivertowne Square', 'GMP Phase 1 · Bid review §5/§24 · risk classes']
];
function loadProjects(): ProjectRec[] {
  try { return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8')) as ProjectRec[]; }
  catch {
    const now = new Date().toISOString();
    const seeded = PROJECT_SEED.map(([name, description]) =>
      ({ id: crypto.randomUUID(), name, description, instructions: '', knowledge: [], createdAt: now, updatedAt: now }));
    try { fs.writeFileSync(PROJECTS_FILE, JSON.stringify(seeded, null, 1)); } catch { /* read-only fs */ }
    return seeded;
  }
}
function saveProjects(all: ProjectRec[]) { fs.writeFileSync(PROJECTS_FILE, JSON.stringify(all, null, 1)); }

app.get('/api/projects', (req: Request, res: Response) => {
  const u = reqUser(req);
  const mine = loadProjects().filter(p => u.role === 'admin' || u.projectIds === '*' || u.projectIds.includes(p.id));
  res.json({ projects: mine.map(p => ({ id: p.id, name: p.name, description: p.description, updatedAt: p.updatedAt, knowledgeCount: p.knowledge.length, hasInstructions: !!p.instructions })) });
});
app.get('/api/projects/:id', (req: Request, res: Response) => {
  const p = loadProjects().find(x => x.id === req.params.id);
  if (!p) { res.status(404).json({ error: 'Project not found' }); return; }
  const u = reqUser(req);
  if (!(u.role === 'admin' || u.projectIds === '*' || u.projectIds.includes(p.id))) { res.status(403).json({ error: 'No access to this project' }); return; }
  res.json(p);
});
// Create (no id) or update (id) — partial updates allowed
app.post('/api/projects', (req: Request, res: Response) => {
  const { id, name, description, instructions, knowledge } = req.body as
    { id?: string; name?: string; description?: string; instructions?: string; knowledge?: { name: string; text: string }[] };
  const all = loadProjects();
  const now = new Date().toISOString();
  let p = id ? all.find(x => x.id === id) : undefined;
  if (id && !p) { res.status(404).json({ error: 'Project not found' }); return; }
  if (!p) {
    if (!name?.trim()) { res.status(400).json({ error: 'name required' }); return; }
    const creator = reqUser(req);
    p = { id: crypto.randomUUID(), name: name.trim(), description: '', instructions: '', knowledge: [],
      createdBy: creator.name || creator.email, createdAt: now, updatedAt: now };
    all.push(p);
    if (creator.role !== 'admin' && creator.projectIds !== '*') {
      const users = loadUsers(); const cu = users.find(x => x.id === creator.id);
      if (cu && cu.projectIds !== '*') { (cu.projectIds as string[]).push(p.id); saveUsers(users); }
    }
  }
  if (name !== undefined && name.trim() && name.trim() !== p.name) {
    // Renaming: carry the project's chats along so they stay linked
    const oldName = p.name;
    p.name = name.trim();
    try {
      for (const f of fs.readdirSync(CHATS_DIR).filter(x => x.endsWith('.json'))) {
        const file = path.join(CHATS_DIR, f);
        const c = JSON.parse(fs.readFileSync(file, 'utf8')) as StoredChat;
        if (c.project === oldName) { c.project = p.name; fs.writeFileSync(file, JSON.stringify(c)); }
      }
    } catch { /* best effort */ }
  }
  if (description !== undefined) p.description = String(description).slice(0, 500);
  if (instructions !== undefined) p.instructions = String(instructions).slice(0, 20_000);
  if (knowledge !== undefined) p.knowledge = knowledge.slice(0, 100).map(k => ({ name: String(k.name).slice(0, 300), text: String(k.text).slice(0, 150_000) }));
  p.updatedAt = now;
  saveProjects(all);
  res.json(p);
});
app.delete('/api/projects/:id', (req: Request, res: Response) => {
  if (reqUser(req).role !== 'admin') { res.status(403).json({ error: 'Admins only' }); return; }
  const all = loadProjects();
  const i = all.findIndex(x => x.id === req.params.id);
  if (i < 0) { res.status(404).json({ error: 'Project not found' }); return; }
  all.splice(i, 1); saveProjects(all);
  res.json({ ok: true });
});

// Sharing, claude.ai style: who has access, and grant/revoke it per project
function projectMembers(p: ProjectRec) {
  return loadUsers()
    .filter(x => x.role === 'admin' || x.projectIds === '*' || x.projectIds.includes(p.id))
    .map(x => ({ id: x.id, name: x.name, email: x.email,
      via: x.role === 'admin' ? 'admin' : x.projectIds === '*' ? 'all' : 'shared' }));
}
app.get('/api/projects/:id/members', (req: Request, res: Response) => {
  const p = loadProjects().find(x => x.id === req.params.id);
  if (!p) { res.status(404).json({ error: 'Project not found' }); return; }
  const u = reqUser(req);
  if (!(u.role === 'admin' || u.projectIds === '*' || u.projectIds.includes(p.id))) { res.status(403).json({ error: 'No access to this project' }); return; }
  res.json({ createdBy: p.createdBy || null, members: projectMembers(p) });
});
// Anyone with access can share with an existing @straticon.com account; only admins can revoke
app.post('/api/projects/:id/share', (req: Request, res: Response) => {
  const p = loadProjects().find(x => x.id === req.params.id);
  if (!p) { res.status(404).json({ error: 'Project not found' }); return; }
  const u = reqUser(req);
  if (!(u.role === 'admin' || u.projectIds === '*' || u.projectIds.includes(p.id))) { res.status(403).json({ error: 'No access to this project' }); return; }
  const { email, remove } = req.body as { email?: string; remove?: boolean };
  const users = loadUsers();
  const target = users.find(x => x.email.toLowerCase() === String(email || '').trim().toLowerCase());
  if (!target) { res.status(404).json({ error: 'No account with that email — ask an admin to add them under People & access first' }); return; }
  if (remove) {
    if (u.role !== 'admin') { res.status(403).json({ error: 'Only admins can remove access' }); return; }
    if (target.role === 'admin' || target.projectIds === '*') { res.status(400).json({ error: 'That person has access to all projects — change it under People & access' }); return; }
    target.projectIds = target.projectIds.filter(x => x !== p.id);
  } else if (target.role !== 'admin' && target.projectIds !== '*' && !target.projectIds.includes(p.id)) {
    target.projectIds.push(p.id);
  }
  saveUsers(users);
  res.json({ createdBy: p.createdBy || null, members: projectMembers(p) });
});

// ---------- Chat persistence: one JSON per chat in .chats/ ----------
const CHATS_DIR = path.join(__dirname, '.chats');
fs.mkdirSync(CHATS_DIR, { recursive: true });

interface StoredChat { id: string; title: string; project: string | null; messages: ChatMessage[]; createdAt: string; updatedAt: string }
function chatFile(id: string): string {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('Bad chat id');
  return path.join(CHATS_DIR, id + '.json');
}

// List chats, newest first (titles only — bodies stay on disk)
app.get('/api/chats', (_req: Request, res: Response) => {
  const chats = fs.readdirSync(CHATS_DIR).filter(f => f.endsWith('.json')).flatMap(f => {
    try {
      const c = JSON.parse(fs.readFileSync(path.join(CHATS_DIR, f), 'utf8')) as StoredChat;
      return [{ id: c.id, title: c.title, project: c.project, updatedAt: c.updatedAt }];
    } catch { return []; }
  }).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  res.json({ chats });
});

app.get('/api/chats/:id', (req: Request, res: Response) => {
  try { res.json(JSON.parse(fs.readFileSync(chatFile(req.params.id), 'utf8'))); }
  catch { res.status(404).json({ error: 'Chat not found' }); }
});

// Create or update a chat; the title comes from the first user message unless already set.
// A call with {id, title} and no messages is a rename.
app.post('/api/chats', (req: Request, res: Response) => {
  try {
    const body = req.body as { id?: string; project?: string | null; messages?: ChatMessage[]; title?: string };
    const { id, title } = body;
    let { project, messages } = body;
    const now = new Date().toISOString();
    const cid = id || crypto.randomUUID();
    let createdAt = now;
    let t = title;
    try {
      const prev = JSON.parse(fs.readFileSync(chatFile(cid), 'utf8')) as StoredChat;
      createdAt = prev.createdAt;
      if (title) t = title; else t = prev.title; // explicit title wins (rename)
      messages ??= prev.messages;               // rename-only calls omit messages
      project ??= prev.project;
    } catch { /* new chat */ }
    if (!Array.isArray(messages)) { res.status(400).json({ error: 'messages required' }); return; }
    if (!t) {
      const first = messages.find(m => m.role === 'user');
      const s = (typeof first?.content === 'string' ? first.content : '').replace(/\s+/g, ' ').trim();
      t = s.length > 60 ? (s.slice(0, 60).replace(/\s+\S*$/, '') || s.slice(0, 60)) + '…' : s || 'New chat';
    }
    const chat: StoredChat = { id: cid, title: t, project: project ?? null, messages, createdAt, updatedAt: now };
    fs.writeFileSync(chatFile(cid), JSON.stringify(chat));
    res.json({ id: cid, title: t });
  } catch (e) { res.status(400).json({ error: (e as Error).message }); }
});

app.delete('/api/chats/:id', (req: Request, res: Response) => {
  try { fs.unlinkSync(chatFile(req.params.id)); res.json({ ok: true }); }
  catch { res.status(404).json({ error: 'Chat not found' }); }
});

// ---------- Your data (claude.ai style): everything Straticon ai stores on this machine, per account ----------
function userDataSummary(u: UserRec) {
  const projects = loadProjects().filter(p => u.role === 'admin' || u.projectIds === '*' || u.projectIds.includes(p.id));
  const names = new Set(projects.map(p => p.name));
  const chats = fs.readdirSync(CHATS_DIR).filter(f => f.endsWith('.json')).flatMap(f => {
    try { return [JSON.parse(fs.readFileSync(path.join(CHATS_DIR, f), 'utf8')) as StoredChat]; } catch { return []; }
  }).filter(c => !c.project || names.has(c.project));
  const bids = loadBids().filter(b => names.has(b.project));
  const docs = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.json')).flatMap(f => {
    try { const d = JSON.parse(fs.readFileSync(path.join(DOCS_DIR, f), 'utf8')) as GenDoc;
      return [{ id: f.slice(0, -5), title: d.title, project: d.project, at: d.at }]; } catch { return []; }
  }).filter(d => !d.project || names.has(d.project));
  return { projects, chats, bids, docs };
}
app.get('/api/account/data', (req: Request, res: Response) => {
  const u = reqUser(req);
  const { projects, chats, bids, docs } = userDataSummary(u);
  res.json({
    account: { name: u.name, email: u.email, role: u.role, createdAt: u.createdAt,
      access: (u.role === 'admin' || u.projectIds === '*') ? 'All projects' : (u.projectIds as string[]).length + ' project(s)' },
    dataDir: __dirname,
    projects: projects.map(p => ({ name: p.name, knowledgeFiles: p.knowledge.length,
      knowledgeChars: p.knowledge.reduce((a, k) => a + (k.text || '').length, 0), hasInstructions: !!p.instructions })),
    chats: chats.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .map(c => ({ id: c.id, title: c.title, project: c.project, messages: c.messages.length, updatedAt: c.updatedAt })),
    bidRecords: bids.map(b => ({ project: b.project, trade: b.trade, bidder: b.bidder, createdAt: b.createdAt })),
    documents: docs.sort((a, b) => b.at - a.at).map(d => ({ title: d.title, project: d.project, at: new Date(d.at).toISOString() }))
  });
});
// One-file export of everything the account can see — full chats, knowledge, records, document texts
app.get('/api/account/export', (req: Request, res: Response) => {
  const u = reqUser(req);
  const { projects, chats, bids, docs } = userDataSummary(u);
  const full = {
    exportedAt: new Date().toISOString(),
    account: { name: u.name, email: u.email, role: u.role, createdAt: u.createdAt },
    projects, chats, bidRecords: bids,
    documents: docs.map(d => { try { return { id: d.id, ...(JSON.parse(fs.readFileSync(genDocFile(d.id), 'utf8')) as GenDoc) }; } catch { return d; } })
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${headerSafeName('Straticon ai export ' + new Date().toISOString().slice(0, 10))}.json"`);
  res.send(JSON.stringify(full, null, 1));
});

// ---------- Autodesk APS: 2-legged token (cached) ----------
let apsToken: string | null = null;
let apsExpiry = 0;

async function getApsToken(): Promise<string> {
  if (apsToken && Date.now() < apsExpiry - 60_000) return apsToken;
  const r = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${process.env.APS_CLIENT_ID}:${process.env.APS_CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials&scope=data:read account:read'
  });
  const data = (await r.json()) as ApsTokenResponse;
  if (!r.ok) throw new Error(data.errorDescription || data.error || 'APS auth failed');
  apsToken = data.access_token;
  apsExpiry = Date.now() + data.expires_in * 1000;
  return apsToken;
}

async function aps(url: string): Promise<unknown> {
  const token = await getApsToken();
  const r = await fetch('https://developer.api.autodesk.com' + url, { headers: { Authorization: 'Bearer ' + token } });
  const data = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(data));
  return data;
}

const apsRoute = (build: (req: Request) => string) => async (req: Request, res: Response) => {
  try { res.json(await aps(build(req))); }
  catch (e) { res.status(500).json({ error: (e as Error).message }); }
};

// List hubs (ACC/BIM 360 accounts the app can see)
app.get('/api/autodesk/hubs', apsRoute(() => '/project/v1/hubs'));
// List projects in a hub
app.get('/api/autodesk/hubs/:hubId/projects', apsRoute(r => `/project/v1/hubs/${r.params.hubId}/projects`));
// A project's top folders
app.get('/api/autodesk/hubs/:hubId/projects/:projId/topfolders',
  apsRoute(r => `/project/v1/hubs/${r.params.hubId}/projects/${r.params.projId}/topFolders`));
// Folder contents (files)
app.get('/api/autodesk/projects/:projId/folders/:folderId/contents',
  apsRoute(r => `/data/v1/projects/${r.params.projId}/folders/${r.params.folderId}/contents`));

// ---------- File text extraction cache ----------
const CACHE_DIR = path.join(__dirname, '.cache');
fs.mkdirSync(CACHE_DIR, { recursive: true });

// ---------- Microsoft Graph (SharePoint / Teams files) ----------
let msToken: string | null = null;
let msExpiry = 0;

async function getMsToken(): Promise<string> {
  if (msToken && Date.now() < msExpiry - 60_000) return msToken;
  const r = await fetch(`https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.MS_CLIENT_ID || '',
      client_secret: process.env.MS_CLIENT_SECRET || '',
      scope: 'https://graph.microsoft.com/.default'
    })
  });
  const data = await r.json() as { access_token?: string; expires_in?: number; error_description?: string };
  if (!r.ok || !data.access_token) throw new Error(data.error_description || 'Microsoft auth failed');
  msToken = data.access_token;
  msExpiry = Date.now() + (data.expires_in ?? 3600) * 1000;
  return msToken;
}

async function graph(url: string): Promise<unknown> {
  const token = await getMsToken();
  const r = await fetch('https://graph.microsoft.com/v1.0' + url, { headers: { Authorization: 'Bearer ' + token } });
  const data = await r.json();
  if (!r.ok) throw new Error((data as { error?: { message?: string } }).error?.message || JSON.stringify(data));
  return data;
}

const graphRoute = (build: (req: Request) => string) => async (req: Request, res: Response) => {
  try { res.json(await graph(build(req))); }
  catch (e) { res.status(500).json({ error: (e as Error).message }); }
};

// All SharePoint/Teams sites in the tenant (each Team = a site)
app.get('/api/sharepoint/sites', graphRoute(() => `/sites?search=*&$select=id,displayName,webUrl&$top=100`));
// A site's document libraries (a Team's channel files live in "Documents")
app.get('/api/sharepoint/sites/:siteId/drives', graphRoute(r => `/sites/${r.params.siteId}/drives?$select=id,name`));
// Folder contents (root or a folder item)
app.get('/api/sharepoint/drives/:driveId/root', graphRoute(r => `/drives/${r.params.driveId}/root/children?$select=id,name,folder,file,size`));
app.get('/api/sharepoint/drives/:driveId/items/:itemId/children', graphRoute(r => `/drives/${r.params.driveId}/items/${r.params.itemId}/children?$select=id,name,folder,file,size`));

// Download a SharePoint file's raw bytes
async function sharepointBytes(driveId: string, itemId: string): Promise<Buffer> {
  const token = await getMsToken();
  const dl = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/content`, {
    headers: { Authorization: 'Bearer ' + token }, redirect: 'follow'
  });
  if (!dl.ok) throw new Error('Download failed: ' + dl.status);
  const buf = Buffer.from(await dl.arrayBuffer());
  if (buf.length > 100 * 1024 * 1024) throw new Error('File over 100 MB — open it in SharePoint instead.');
  return buf;
}

// Download a SharePoint file and extract its text (shared by the browser route and Straticon ai's tools)
async function sharepointText(driveId: string, itemId: string, name: string): Promise<{ text: string; cached: boolean }> {
  // sha256 of the full ids — a truncated base64 key collided across files in the same drive
  const cacheFile = path.join(CACHE_DIR, 'sp_' + crypto.createHash('sha256').update(driveId + '|' + itemId).digest('hex') + '.txt');
  if (fs.existsSync(cacheFile)) return { text: fs.readFileSync(cacheFile, 'utf8'), cached: true };
  const buf = await sharepointBytes(driveId, itemId);
  const text = await extractText(name, buf);
  fs.writeFileSync(cacheFile, text, 'utf8');
  return { text, cached: false };
}

app.get('/api/sharepoint/text', async (req: Request, res: Response) => {
  try {
    const driveId = String(req.query.driveId || '');
    const itemId = String(req.query.itemId || '');
    const name = String(req.query.name || 'file');
    if (!driveId || !itemId) { res.status(400).json({ error: 'driveId and itemId required' }); return; }
    const { text, cached } = await sharepointText(driveId, itemId, name);
    res.json({ text, cached, name });
  } catch (e) {
    const msg = (e as Error).message;
    res.status(msg.startsWith('UNSUPPORTED:') || msg.startsWith('EMPTY:') ? 415 : 500).json({ error: msg.replace(/^(UNSUPPORTED|EMPTY):/, '') });
  }
});

// Shared text extraction for both sources
async function extractText(name: string, buf: Buffer): Promise<string> {
  const lower = name.toLowerCase();
  let text: string;
  if (lower.endsWith('.pdf')) {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    const parsed = await parser.getText();
    await parser.destroy();
    text = parsed.text || '';
  } else if (/\.(xlsx|xlsm)$/.test(lower)) {
    text = await extractXlsx(buf);
  } else if (lower.endsWith('.xls')) {
    // Legacy BIFF Excel via SheetJS, rendered in the same row format as extractXlsx
    const XLSX = await import('xlsx');
    const wb = XLSX.read(buf, { type: 'buffer' });
    const out: string[] = [];
    for (const sn of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[sn], { header: 1, raw: false, defval: '' });
      const lines: string[] = [];
      rows.forEach((r, i) => {
        const cells = r.map(c => String(c ?? '').replace(/\s+/g, ' ').trim());
        while (cells.length && !cells[cells.length - 1]) cells.pop();
        if (cells.some(Boolean)) lines.push(`R${i + 1}: ${cells.join(' | ')}`);
      });
      if (lines.length) out.push(`=== Sheet: ${sn} ===\n${lines.join('\n')}`);
    }
    text = out.join('\n\n');
  } else if (lower.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const r = await mammoth.extractRawText({ buffer: buf });
    text = r.value || '';
  } else if (lower.endsWith('.msg')) {
    // Outlook email: headers + body
    const mod = await import('@kenjiuno/msgreader') as unknown as { default: new (b: Buffer) => { getFileData(): Record<string, unknown> } };
    const MsgReader = (mod as { default?: typeof mod.default }).default ?? (mod as unknown as typeof mod.default);
    const d = new MsgReader(buf).getFileData() as {
      senderName?: string; senderEmail?: string; subject?: string; body?: string;
      messageDeliveryTime?: string; clientSubmitTime?: string;
      recipients?: { name?: string; email?: string }[];
    };
    text = `From: ${d.senderName ?? ''} <${d.senderEmail ?? ''}>\n` +
      `To: ${(d.recipients ?? []).map(r => r.name || r.email || '').filter(Boolean).join(', ')}\n` +
      `Date: ${d.messageDeliveryTime ?? d.clientSubmitTime ?? ''}\n` +
      `Subject: ${d.subject ?? ''}\n\n${d.body ?? ''}`;
  } else if (/\.(txt|md|csv|json|log)$/.test(lower)) {
    text = buf.toString('utf8');
  } else {
    throw new Error(`UNSUPPORTED:Can't extract text from "${name}" yet — PDF, Excel (.xlsx/.xls), Word (.docx), Outlook (.msg), text and CSV files are supported.`);
  }
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  if (!text) throw new Error(`EMPTY:"${name}" has no extractable text (likely a scanned document — OCR comes later).`);
  return text;
}

// Excel → text: one block per sheet, one line per non-empty row, cells joined with " | ".
// Uses displayed values (formula results, formatted numbers) and skips merged-cell duplicates.
async function extractXlsx(buf: Buffer): Promise<string> {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const out: string[] = [];
  wb.eachSheet(ws => {
    const rows: string[] = [];
    ws.eachRow({ includeEmpty: false }, row => {
      const cells: string[] = [];
      for (let c = 1; c <= row.cellCount; c++) {
        const cell = row.getCell(c);
        const isDup = cell.isMerged && cell.master.address !== cell.address;
        let v = '';
        try {
          v = isDup ? ''
            : cell.value instanceof Date ? cell.value.toISOString().slice(0, 10) // exceljs parses Excel dates as UTC
            : cell.text;
        } catch { v = String(cell.value ?? ''); }
        cells.push(String(v ?? '').replace(/\s+/g, ' ').trim());
      }
      while (cells.length && !cells[cells.length - 1]) cells.pop();
      if (cells.some(Boolean)) rows.push(`R${row.number}: ${cells.join(' | ')}`);
    });
    if (rows.length) out.push(`=== Sheet: ${ws.name}${ws.state !== 'visible' ? ' (hidden)' : ''} ===\n${rows.join('\n')}`);
  });
  return out.join('\n\n');
}

interface VersionData { data?: { attributes?: { displayName?: string }, relationships?: { storage?: { data?: { id?: string } } } } }

// Download an ACC file version's raw bytes (plus its display name)
async function autodeskBytes(projId: string, versionId: string): Promise<{ buf: Buffer; name: string }> {
  // 1. Version → storage object
  const ver = await aps(`/data/v1/projects/${encodeURIComponent(projId)}/versions/${encodeURIComponent(versionId)}`) as VersionData;
  const name = ver.data?.attributes?.displayName || 'file';
  const storageId = ver.data?.relationships?.storage?.data?.id; // urn:adsk.objects:os.object:bucket/objectKey
  if (!storageId) throw new Error('No downloadable storage for this file (it may be a cloud model).');
  const m = storageId.match(/^urn:adsk\.objects:os\.object:([^/]+)\/(.+)$/);
  if (!m) throw new Error('Unexpected storage id: ' + storageId);

  // 2. Signed download URL
  const signed = await aps(`/oss/v2/buckets/${m[1]}/objects/${encodeURIComponent(m[2])}/signeds3download`) as { url?: string };
  if (!signed.url) throw new Error('Could not get download URL');

  // 3. Download (cap at 100 MB)
  const dl = await fetch(signed.url);
  if (!dl.ok) throw new Error('Download failed: ' + dl.status);
  const buf = Buffer.from(await dl.arrayBuffer());
  if (buf.length > 100 * 1024 * 1024) throw new Error('File over 100 MB — open it in ACC instead.');
  return { buf, name };
}

// Download an ACC file version and extract its text (shared by the browser route and Straticon ai's tools)
async function autodeskText(projId: string, versionId: string): Promise<{ text: string; name: string; cached: boolean }> {
  const cacheFile = path.join(CACHE_DIR, Buffer.from(versionId).toString('base64url') + '.txt');
  if (fs.existsSync(cacheFile)) {
    // Version lookup still needed for the display name on a cache hit
    const ver = await aps(`/data/v1/projects/${encodeURIComponent(projId)}/versions/${encodeURIComponent(versionId)}`) as VersionData;
    return { text: fs.readFileSync(cacheFile, 'utf8'), name: ver.data?.attributes?.displayName || 'file', cached: true };
  }
  const { buf, name } = await autodeskBytes(projId, versionId);
  const text = await extractText(name, buf);
  fs.writeFileSync(cacheFile, text, 'utf8');
  return { text, name, cached: false };
}

app.get('/api/autodesk/text', async (req: Request, res: Response) => {
  try {
    const projId = String(req.query.projectId || '');
    const versionId = String(req.query.versionId || '');
    if (!projId || !versionId) { res.status(400).json({ error: 'projectId and versionId required' }); return; }
    const { text, name, cached } = await autodeskText(projId, versionId);
    res.json({ text, name, cached });
  } catch (e) {
    const msg = (e as Error).message;
    res.status(msg.startsWith('UNSUPPORTED:') ? 415 : msg.startsWith('EMPTY:') ? 422 : 500).json({ error: msg.replace(/^(UNSUPPORTED|EMPTY):/, '') });
  }
});

// ---------- Scope templates: catalog → AI fill → review → download (.xlsx/.pdf) or save to SharePoint ----------
const TPL_DIV_NAMES: Record<number, string> = {
  1: 'General Requirements', 2: 'Existing Conditions / Sitework', 3: 'Concrete', 4: 'Masonry', 5: 'Metals',
  6: 'Wood & Carpentry', 7: 'Thermal & Moisture', 8: 'Openings', 9: 'Finishes', 10: 'Specialties',
  11: 'Equipment / Appliances', 12: 'Furnishings', 13: 'Special Construction', 14: 'Conveying',
  21: 'Fire Suppression', 22: 'Plumbing', 23: 'HVAC', 26: 'Electrical', 27: 'Communications',
  28: 'Electronic Safety', 31: 'Earthwork', 32: 'Exterior Improvements', 33: 'Utilities',
  34: 'Transportation', 35: 'Waterway & Marine'
};
function tplDivOf(name: string, p: string): number | null {
  const hay = name + ' | ' + p;
  const m = hay.match(/(?:^|[^a-z0-9])div(?:ision)?\.?\s*0?(\d{1,2})(?!\d)/i) ||
            hay.match(/(?:^|[^a-z0-9])scope\s*0?(\d{1,2})(?!\d)/i) ||
            p.match(/\/\s*0?(\d{1,2})\s*-\s*[A-Za-z]/);
  return m ? parseInt(m[1], 10) : null;
}
interface TplFile { driveId: string; itemId: string; name: string; path: string; modified: string }
const tplCatalogCache = new Map<string, { at: number; masters: TplFile[]; categories: { div: number; label: string; latest: TplFile }[] }>();

async function templateCatalog(project: string) {
  const key = project.toLowerCase();
  const hit = tplCatalogCache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit;
  const site = await resolveProjectSite(project);
  const all: TplFile[] = [];
  for (const d of site.drives) {
    let url: string | null = `/drives/${d.id}/root/search(q='scope')?$select=id,name,folder,parentReference,lastModifiedDateTime&$top=200`;
    while (url) {
      const r = await graph(url) as { value?: { id: string; name: string; folder?: unknown; parentReference?: { path?: string }; lastModifiedDateTime?: string }[]; '@odata.nextLink'?: string };
      for (const it of r.value ?? []) {
        if (it.folder || !/\.(xlsx|xlsm)$/i.test(it.name)) continue;
        const p = (it.parentReference?.path ?? '').replace(/^\/drives\/[^/]+\/root:?/, '') || '/';
        all.push({ driveId: d.id, itemId: it.id, name: it.name, path: `${d.name}${p}`, modified: (it.lastModifiedDateTime ?? '').slice(0, 10) });
      }
      url = r['@odata.nextLink'] ? r['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0', '') : null;
    }
  }
  const masters = all.filter(f => /template|master|blank/i.test(f.name));
  const byDiv = new Map<number, TplFile>();
  for (const f of all) {
    const d = tplDivOf(f.name, f.path);
    if (!d || !TPL_DIV_NAMES[d]) continue;
    const prev = byDiv.get(d);
    if (!prev || f.modified > prev.modified) byDiv.set(d, f);
  }
  const categories = [...byDiv.entries()].sort((a, b) => a[0] - b[0])
    .map(([div, latest]) => ({ div, label: `Div ${String(div).padStart(2, '0')} — ${TPL_DIV_NAMES[div]}`, latest }));
  const entry = { at: Date.now(), masters, categories };
  tplCatalogCache.set(key, entry);
  return entry;
}

app.get('/api/templates', async (req: Request, res: Response) => {
  try {
    const project = String(req.query.project || '');
    if (!project) { res.status(400).json({ error: 'project required' }); return; }
    if (!canAccess(reqUser(req), project)) { res.status(403).json({ error: 'No access to this project' }); return; }
    const c = await templateCatalog(project);
    res.json({ masters: c.masters, categories: c.categories });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// In-progress fills: template bytes + metadata, kept half an hour
const fills = new Map<string, { buf: Buffer; name: string; driveId: string; itemId: string; at: number }>();
setInterval(() => { const cut = Date.now() - 30 * 60_000; for (const [k, v] of fills) if (v.at < cut) fills.delete(k); }, 5 * 60_000).unref();

interface TplEdit { sheet: string; cell: string; label: string; value: string }

// AI fill: map the user's info (form fields and/or pasted text) onto the template's cells
app.post('/api/templates/fill', async (req: Request, res: Response) => {
  try {
    const { project, driveId, itemId, name, info } = req.body as { project?: string; driveId: string; itemId: string; name: string; info: string };
    if (!driveId || !itemId || !info?.trim()) { res.status(400).json({ error: 'driveId, itemId and info required' }); return; }
    if (project && !canAccess(reqUser(req), project)) { res.status(403).json({ error: 'No access to this project' }); return; }
    const buf = await sharepointBytes(driveId, itemId);

    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    let cells = '';
    wb.eachSheet(ws => {
      if (ws.state !== 'visible') return;
      cells += `=== Sheet: ${ws.name} ===\n`;
      ws.eachRow({ includeEmpty: false }, row => {
        const parts: string[] = [];
        row.eachCell({ includeEmpty: false }, c => {
          const isDup = c.isMerged && c.master.address !== c.address;
          if (isDup) return;
          let v = ''; try { v = c.formula ? `=FORMULA` : c.text; } catch { v = String(c.value ?? ''); }
          v = String(v ?? '').replace(/\s+/g, ' ').trim(); // cell.text can return non-strings (numbers/rich text)
          if (v) parts.push(`${c.address}: ${v}`);
        });
        if (parts.length) cells += parts.join(' | ') + '\n';
      });
    });
    cells = cells.slice(0, 80_000);

    anthropic ??= new Anthropic();
    const msg = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5',
      max_tokens: 8192,
      system: 'You fill Straticon scope-sheet Excel templates. Given a template\'s cells (address: value) and the user\'s information, return ONLY a JSON array of edits: [{"sheet":"<sheet name>","cell":"<address>","label":"<short human label for what this cell is>","value":"<new value>"}]. Rules: fill bidder/company, project, trade, date, pricing and scope line entries that the user\'s information supports; put scope items in the rows the template provides for them; NEVER write to cells whose value is =FORMULA; never invent prices or facts the user did not give; prefer leaving a cell alone over guessing. Dates as MM/DD/YY. Plain numbers for currency cells (no $ or commas).' +
        (project ? ` The active project is ${project}.` : ''),
      messages: [{ role: 'user', content: `TEMPLATE: ${name}\n\n${cells}\n\nUSER INFORMATION TO FILL IN:\n${info.slice(0, 20_000)}` }]
    });
    const text = msg.content.filter(c => c.type === 'text').map(c => (c as { text: string }).text).join('');
    const jsonStr = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);
    let edits: TplEdit[] = [];
    try { edits = JSON.parse(jsonStr); } catch { res.status(502).json({ error: 'The model did not return valid edits — try rephrasing the info.' }); return; }

    const fillId = crypto.randomUUID();
    fills.set(fillId, { buf, name, driveId, itemId, at: Date.now() });
    res.json({ fillId, edits });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// Finalize: apply (possibly user-adjusted) edits, then download as .xlsx/.pdf or save to SharePoint
app.post('/api/templates/finalize', async (req: Request, res: Response) => {
  try {
    const { fillId, edits, action, fileName } = req.body as { fillId: string; edits: TplEdit[]; action: 'xlsx' | 'pdf' | 'sharepoint' | 'onedrive'; fileName: string };
    const fill = fills.get(fillId);
    if (!fill) { res.status(410).json({ error: 'This fill session expired — fill the template again.' }); return; }
    const safeName = (fileName || 'scope').replace(/[\\/:*?"<>|]/g, '-').trim();

    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(fill.buf as unknown as ArrayBuffer);
    for (const e of edits ?? []) {
      try {
        const ws = wb.getWorksheet(e.sheet); if (!ws) continue;
        const cell = ws.getCell(e.cell);
        if (cell.formula) continue; // never clobber formulas
        const num = /^-?\d+(\.\d+)?$/.test(String(e.value).trim());
        cell.value = num ? Number(e.value) : e.value;
      } catch { /* skip bad addresses */ }
    }
    const out = Buffer.from(await wb.xlsx.writeBuffer());

    if (action === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${headerSafeName(safeName)}.xlsx"`);
      res.send(out); return;
    }
    if (action === 'onedrive') {
      const od = await oneDriveUpload(reqUser(req).email, headerSafeName(safeName) + '.xlsx', out,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.json({ ok: true, webUrl: od.webUrl, name: headerSafeName(safeName) + '.xlsx' }); return;
    }
    if (action === 'pdf') {
      // Simple documentation PDF: sheet values laid out row by row (not a pixel-exact Excel render)
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ size: 'LETTER', margin: 36 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${headerSafeName(safeName)}.pdf"`);
      doc.pipe(res);
      doc.fontSize(14).text(safeName, { underline: true }).moveDown(0.5);
      wb.eachSheet(ws => {
        if (ws.state !== 'visible') return;
        doc.fontSize(11).fillColor('#222').text(ws.name, { underline: true }).moveDown(0.3);
        doc.fontSize(8).fillColor('#000');
        ws.eachRow({ includeEmpty: false }, row => {
          const vals: string[] = [];
          row.eachCell({ includeEmpty: false }, c => {
            if (c.isMerged && c.master.address !== c.address) return;
            const v = (() => { try { return c.text; } catch { return String(c.value ?? ''); } })().replace(/\s+/g, ' ').trim();
            if (v) vals.push(v);
          });
          if (vals.length) doc.text(vals.join('   |   '), { width: 540 });
        });
        doc.moveDown(1);
      });
      doc.end(); return;
    }
    if (action === 'sharepoint') {
      // Save next to the template it was made from — needs write permission on the Entra app
      const meta = await graph(`/drives/${fill.driveId}/items/${fill.itemId}?$select=parentReference`) as { parentReference?: { id?: string } };
      const parentId = meta.parentReference?.id;
      if (!parentId) { res.status(500).json({ error: 'Could not locate the template folder.' }); return; }
      const token = await getMsToken();
      const up = await fetch(`https://graph.microsoft.com/v1.0/drives/${fill.driveId}/items/${parentId}:/${encodeURIComponent(safeName + '.xlsx')}:/content`, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        body: new Uint8Array(out)
      });
      const data = await up.json() as { webUrl?: string; error?: { message?: string } };
      if (!up.ok) {
        const msg = up.status === 403
          ? 'SharePoint save needs write permission: grant the Entra app Sites.ReadWrite.All (admin consent) — it currently has read-only access.'
          : (data.error?.message || 'Upload failed: ' + up.status);
        res.status(up.status).json({ error: msg }); return;
      }
      res.json({ ok: true, webUrl: data.webUrl, name: safeName + '.xlsx' }); return;
    }
    res.status(400).json({ error: 'Unknown action' });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// ---------- Export an assistant reply as a branded Word or PDF document (client-facing letters) ----------
app.post('/api/document', async (req: Request, res: Response) => {
  try {
    const body = req.body as { title?: string; project?: string | null; markdown?: string; format: 'docx' | 'pdf'; docId?: string; to?: 'download' | 'onedrive' };
    let { title, project, markdown } = body;
    const { format, docId, to } = body;
    if (docId) { // a model-generated document: clean content stored server-side
      try {
        const d = JSON.parse(fs.readFileSync(genDocFile(docId), 'utf8')) as GenDoc;
        title = d.title; markdown = d.markdown; project = d.project;
      } catch { res.status(410).json({ error: 'This document has expired — ask Straticon ai to draft it again.' }); return; }
    }
    if (!markdown?.trim()) { res.status(400).json({ error: 'markdown required' }); return; }
    const docTitle = (title || 'Straticon Pre-Construction').slice(0, 120);
    const safeName = docTitle.replace(/[\\/:*?"<>|]/g, '-').trim();
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Parse our limited markdown into blocks: heading | bullet | table | paragraph
    type Block = { kind: 'h'; text: string } | { kind: 'li'; text: string } | { kind: 'table'; rows: string[][] } | { kind: 'p'; text: string };
    const blocks: Block[] = [];
    const lines = markdown.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i];
      if (/^\s*\|.*\|\s*$/.test(L)) {
        const rows: string[][] = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i])) rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
          i++;
        }
        i--;
        if (rows.length) blocks.push({ kind: 'table', rows });
      } else if (/^#{1,4}\s/.test(L)) blocks.push({ kind: 'h', text: L.replace(/^#+\s*/, '') });
      else if (/^\s*[-*]\s/.test(L)) blocks.push({ kind: 'li', text: L.replace(/^\s*[-*]\s/, '') });
      else if (L.trim()) blocks.push({ kind: 'p', text: L.trim() });
    }
    const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');

    if (format === 'docx') {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } = await import('docx');
      // Bold-aware runs for **segments**
      const runs = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map(seg =>
        seg.startsWith('**') ? new TextRun({ text: seg.slice(2, -2), bold: true }) : new TextRun(plain(seg)));
      const children: InstanceType<typeof Paragraph | typeof Table>[] = [
        new Paragraph({ children: [new TextRun({ text: 'STRATICON', bold: true, size: 44 }), new TextRun({ text: '  ·  Pre-Construction', size: 22, color: '64869F' })] }),
        new Paragraph({ children: [new TextRun({ text: `${project ? project + '  ·  ' : ''}${today}`, size: 20, color: '666666' })], spacing: { after: 240 } }),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: docTitle, bold: true })], spacing: { after: 200 } })
      ];
      for (const b of blocks) {
        if (b.kind === 'h') children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: runs(b.text), spacing: { before: 220, after: 110 } }));
        else if (b.kind === 'li') children.push(new Paragraph({ children: runs(b.text), bullet: { level: 0 }, spacing: { after: 60 } }));
        else if (b.kind === 'p') children.push(new Paragraph({ children: runs(b.text), spacing: { after: 110 } }));
        else {
          children.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: b.rows.map((r, ri) => new TableRow({
              children: r.map(c => new TableCell({
                children: [new Paragraph({ children: ri === 0 ? [new TextRun({ text: plain(c), bold: true })] : runs(c) })],
                borders: { top: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' }, bottom: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
                  left: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' }, right: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' } }
              }))
            }))
          }));
          children.push(new Paragraph({ children: [], spacing: { after: 110 } }));
        }
      }
      const doc = new Document({ sections: [{ children }] });
      const out = Buffer.from(await Packer.toBuffer(doc));
      const mimeW = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      if (to === 'onedrive') {
        const od = await oneDriveUpload(reqUser(req).email, headerSafeName(safeName) + '.docx', out, mimeW);
        res.json({ ok: true, webUrl: od.webUrl, name: headerSafeName(safeName) + '.docx' }); return;
      }
      res.setHeader('Content-Type', mimeW);
      res.setHeader('Content-Disposition', `attachment; filename="${headerSafeName(safeName)}.docx"`);
      res.send(out); return;
    }

    // PDF via pdfkit — rendered to a buffer so it can download OR go to OneDrive
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'LETTER', margins: { top: 54, left: 54, right: 54, bottom: 54 } });
    const pdfChunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => pdfChunks.push(c));
    const pdfDone = new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(pdfChunks))));
    // Header drawn at explicit positions — a "continued" line with mixed font sizes makes
    // pdfkit place the next line against the SMALL font's height, overlapping the brand text.
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#1a2129').text('STRATICON', 54, 50, { lineBreak: false });
    const brandW = doc.widthOfString('STRATICON');
    doc.font('Helvetica').fontSize(10).fillColor('#64869f').text('·  Pre-Construction', 54 + brandW + 10, 58, { lineBreak: false });
    doc.font('Helvetica').fontSize(9).fillColor('#666').text(`${project ? project + '  ·  ' : ''}${today}`, 54, 78);
    doc.moveTo(54, 94).lineTo(558, 94).strokeColor('#d4dce2').lineWidth(0.75).stroke();
    doc.x = 54; doc.y = 106;
    doc.font('Helvetica-Bold').fontSize(15).fillColor('#000').text(plain(docTitle), 54, 106, { width: 504 });
    doc.moveDown(0.6); doc.x = 54;
    const width = 504;
    for (const b of blocks) {
      if (doc.y > 700) doc.addPage();
      if (b.kind === 'h') { doc.moveDown(0.5).font('Helvetica-Bold').fontSize(11.5).fillColor('#1a2129').text(plain(b.text)); doc.moveDown(0.2); }
      else if (b.kind === 'li') { doc.font('Helvetica').fontSize(9.5).fillColor('#222').text('•  ' + plain(b.text), { width, indent: 10 }); }
      else if (b.kind === 'p') { doc.font('Helvetica').fontSize(9.5).fillColor('#222').text(plain(b.text), { width }); doc.moveDown(0.25); }
      else {
        const cols = Math.max(...b.rows.map(r => r.length));
        const cw = width / cols;
        for (let ri = 0; ri < b.rows.length; ri++) {
          if (doc.y > 690) doc.addPage();
          const y0 = doc.y;
          doc.font(ri === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor('#222');
          let maxH = 0;
          b.rows[ri].forEach((c, ci) => {
            const h = doc.heightOfString(plain(c), { width: cw - 10 });
            doc.text(plain(c), 54 + ci * cw + 4, y0 + 3, { width: cw - 10 });
            maxH = Math.max(maxH, h);
          });
          doc.moveTo(54, y0).lineTo(54 + width, y0).strokeColor('#cccccc').lineWidth(0.5).stroke();
          doc.x = 54; doc.y = y0 + maxH + 7;
        }
        doc.moveTo(54, doc.y).lineTo(54 + width, doc.y).strokeColor('#cccccc').lineWidth(0.5).stroke();
        doc.moveDown(0.5); doc.x = 54;
      }
    }
    doc.end();
    const pdfBuf = await pdfDone;
    if (to === 'onedrive') {
      const od = await oneDriveUpload(reqUser(req).email, headerSafeName(safeName) + '.pdf', pdfBuf, 'application/pdf');
      res.json({ ok: true, webUrl: od.webUrl, name: headerSafeName(safeName) + '.pdf' }); return;
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${headerSafeName(safeName)}.pdf"`);
    res.send(pdfBuf);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// ---------- Bid record routes + Excel builders (record workbook, leveling sheet) ----------
app.get('/api/bidrecords', (req: Request, res: Response) => {
  const project = String(req.query.project || '');
  if (!project) { res.status(400).json({ error: 'project required' }); return; }
  if (!canAccess(reqUser(req), project)) { res.status(403).json({ error: 'No access to this project' }); return; }
  res.json({ records: loadBids(project).map(r => ({ id: r.id, trade: r.trade, division: r.division, bidder: r.bidder,
    proposal_date: r.proposal_date, base_bid: r.base_bid, adjusted: adjustedBid(r), createdAt: r.createdAt })) });
});
app.delete('/api/bidrecords/:id', (req: Request, res: Response) => {
  try {
    const r = JSON.parse(fs.readFileSync(bidFile(req.params.id), 'utf8')) as BidRecord;
    if (!canAccess(reqUser(req), r.project)) { res.status(403).json({ error: 'No access' }); return; }
    fs.unlinkSync(bidFile(req.params.id)); res.json({ ok: true });
  } catch { res.status(404).json({ error: 'Record not found' }); }
});

// ---------- Connectors panel: live health of each org-level integration ----------
let connectorsCache: { at: number; forUser: string; list: unknown[] } | null = null;
app.get('/api/connectors', async (req: Request, res: Response) => {
  const u = reqUser(req);
  if (connectorsCache && Date.now() - connectorsCache.at < 5 * 60_000 && connectorsCache.forUser === u.id) {
    res.json({ connectors: connectorsCache.list, cachedAt: connectorsCache.at }); return;
  }
  const probe = async (fn: () => Promise<void>): Promise<{ status: string; detail: string }> => {
    try { await fn(); return { status: 'connected', detail: '' }; }
    catch (e) { return { status: 'error', detail: (e as Error).message.slice(0, 160) }; }
  };
  const [sp, od, acc] = await Promise.all([
    probe(async () => { await graph('/sites?search=*&$select=id&$top=1'); }),
    probe(async () => { await graph(`/users/${encodeURIComponent(u.email)}/drive?$select=id`); }),
    probe(async () => { await aps('/project/v1/hubs'); })
  ]);
  const list = [
    { name: 'Microsoft SharePoint / Teams', kind: 'Organization', scope: 'Project documents (read) + saves', ...sp },
    { name: 'Microsoft OneDrive', kind: 'Per user (via your sign-in)', scope: `Saves to ${u.email}'s OneDrive → "Straticon ai" folder`, ...od },
    { name: 'Autodesk ACC / BIM 360', kind: 'Organization', scope: 'Drawings, specs, project files (read)', ...acc },
    { name: 'Anthropic Claude', kind: 'Organization', scope: 'Straticon ai model (' + (process.env.CLAUDE_MODEL || 'claude-sonnet-5-5') + ')',
      status: process.env.ANTHROPIC_API_KEY ? 'connected' : 'error', detail: process.env.ANTHROPIC_API_KEY ? '' : 'ANTHROPIC_API_KEY missing' }
  ];
  connectorsCache = { at: Date.now(), forUser: u.id, list };
  res.json({ connectors: list, cachedAt: connectorsCache.at });
});

// ---------- OneDrive: save generated files into the signed-in user's own OneDrive ----------
// Uses Graph application permission Files.ReadWrite.All; files land in a "Straticon ai" folder.
async function oneDriveUpload(email: string, fileName: string, buf: Buffer, mime: string): Promise<{ webUrl?: string }> {
  const token = await getMsToken();
  const put = () => fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}/drive/root:/${encodeURIComponent('Straticon ai')}/${encodeURIComponent(fileName)}:/content`,
    { method: 'PUT', headers: { Authorization: 'Bearer ' + token, 'Content-Type': mime }, body: new Uint8Array(buf) });
  let r = await put();
  if (r.status === 404 || r.status === 400) {
    // Parent folder may not exist yet — create "Straticon ai" at the drive root, then retry once
    await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}/drive/root/children`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Straticon ai', folder: {}, '@microsoft.graph.conflictBehavior': 'replace' })
    });
    r = await put();
  }
  const data = await r.json() as { webUrl?: string; error?: { message?: string } };
  if (!r.ok) {
    throw new Error(r.status === 403
      ? 'OneDrive save needs the Entra app permission Files.ReadWrite.All (admin consent).'
      : (data.error?.message || 'OneDrive upload failed: ' + r.status));
  }
  return { webUrl: data.webUrl };
}

// HTTP headers only take Latin-1: strip smart dashes/quotes and anything non-ASCII from filenames,
// or Node throws "Invalid character in header content".
function headerSafeName(s: string): string {
  return s.normalize('NFKD')
    .replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '')
    .replace(/[^\x20-\x7E]/g, '').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim() || 'document';
}

const CURRENCY = '"$"#,##0';
app.get('/api/bidrecords/:id/xlsx', async (req: Request, res: Response) => {
  try {
    const r = JSON.parse(fs.readFileSync(bidFile(req.params.id), 'utf8')) as BidRecord;
    if (!canAccess(reqUser(req), r.project)) { res.status(403).json({ error: 'No access' }); return; }
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Bid Review Record');
    ws.getColumn(1).width = 42; ws.getColumn(2).width = 18; ws.getColumn(3).width = 60;
    const title = ws.addRow([`BID REVIEW RECORD — ${r.bidder}`]); title.font = { bold: true, size: 14 };
    ws.addRow([`${r.project} · ${r.trade}${r.division ? ` (Div ${String(r.division).padStart(2, '0')})` : ''} · Proposal ${r.proposal_date || 'n/a'}`]).font = { color: { argb: 'FF666666' } };
    ws.addRow([]);
    const money = (label: string, v: number, bold = false) => {
      const row = ws.addRow([label, v]); row.getCell(2).numFmt = CURRENCY; if (bold) row.font = { bold: true }; return row;
    };
    money('Base Bid', r.base_bid, true);
    const section = (label: string, lines: AdjLine[], sign: 1 | -1) => {
      if (!lines.length) return;
      ws.addRow([]); ws.addRow([label.toUpperCase()]).font = { bold: true };
      for (const l of lines) money('  ' + l.item, sign * l.value);
      money(`  Subtotal — ${label}`, sign * adjSum(lines), true);
    };
    section('Missing Scope (+)', r.missing_scope, 1);
    section('Required Allowances (+)', r.required_allowances, 1);
    section('Known Additions (+)', r.known_additions, 1);
    section('Duplicated Scope (−)', r.duplicated_scope, -1);
    ws.addRow([]);
    const adj = money('ADJUSTED BID', adjustedBid(r), true); adj.font = { bold: true, size: 12 };
    const list = (label: string, items: string[]) => {
      if (!items.length) return;
      ws.addRow([]); ws.addRow([label.toUpperCase()]).font = { bold: true };
      items.forEach(x => ws.addRow(['', '', '• ' + x]).getCell(3).alignment = { wrapText: true });
    };
    list('Inclusions', r.inclusions); list('Exclusions', r.exclusions); list('Qualifications', r.qualifications);
    if (r.alternates.length) {
      ws.addRow([]); ws.addRow(['ALTERNATES']).font = { bold: true };
      for (const a of r.alternates) { const row = ws.addRow([a.description, a.value, a.accepted || '']); row.getCell(2).numFmt = CURRENCY; }
    }
    const kv = (k: string, v: string) => { if (v) ws.addRow([k, '', v]).getCell(3).alignment = { wrapText: true }; };
    ws.addRow([]); kv('Bond', r.bond); kv('Schedule', r.schedule); kv('Payment terms', r.payment_terms); kv('Notes', r.notes);
    if (r.sources.length) { ws.addRow([]); kv('Sources', r.sources.join('; ')); }
    const out = Buffer.from(await wb.xlsx.writeBuffer());
    const fn = `${r.project}_${r.trade}_${r.bidder}_Bid Review Record`.replace(/[\\/:*?"<>|]/g, '-');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${headerSafeName(fn)}.xlsx"`);
    res.send(out);
  } catch (e) { res.status(404).json({ error: (e as Error).message }); }
});

// Leveling sheet: one column per bidder for a trade, with live Excel formulas for the adjusted bid
app.get('/api/leveling', async (req: Request, res: Response) => {
  try {
    const project = String(req.query.project || '');
    const trade = String(req.query.trade || '');
    if (!project || !trade) { res.status(400).json({ error: 'project and trade required' }); return; }
    if (!canAccess(reqUser(req), project)) { res.status(403).json({ error: 'No access to this project' }); return; }
    const recs = loadBids(project).filter(r => r.trade === trade);
    if (!recs.length) { res.status(404).json({ error: 'No bid records for that trade yet' }); return; }

    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Leveling');
    const colOf = (i: number) => String.fromCharCode(66 + i); // B, C, D…
    ws.getColumn(1).width = 46;
    recs.forEach((_, i) => { ws.getColumn(2 + i).width = 20; });
    ws.addRow([`BID LEVELING — ${trade}`]).font = { bold: true, size: 14 };
    ws.addRow([`${project} · generated ${new Date().toLocaleDateString('en-US')} · Adjusted = Base + Missing Scope + Required Allowances + Known Additions − Duplicated Scope`]).font = { color: { argb: 'FF666666' } };
    ws.addRow([]);
    const hdr = ws.addRow(['', ...recs.map(r => r.bidder)]); hdr.font = { bold: true };
    ws.addRow(['Proposal date', ...recs.map(r => r.proposal_date || '—')]);
    const baseRow = ws.addRow(['Base Bid', ...recs.map(r => r.base_bid)]); baseRow.font = { bold: true };
    baseRow.eachCell((c, n) => { if (n > 1) c.numFmt = CURRENCY; });

    // Union of adjustment line items per section, one row each, per-bidder values
    const sections: { key: 'missing_scope' | 'required_allowances' | 'known_additions' | 'duplicated_scope'; label: string }[] = [
      { key: 'missing_scope', label: 'MISSING SCOPE (+)' },
      { key: 'required_allowances', label: 'REQUIRED ALLOWANCES (+)' },
      { key: 'known_additions', label: 'KNOWN ADDITIONS (+)' },
      { key: 'duplicated_scope', label: 'DUPLICATED SCOPE (−)' }
    ];
    const subtotalRows: Record<string, number> = {};
    for (const sec of sections) {
      const items = [...new Set(recs.flatMap(r => r[sec.key].map(l => l.item)))];
      ws.addRow([]);
      ws.addRow([sec.label]).font = { bold: true };
      const first = ws.rowCount + 1;
      for (const item of items) {
        const row = ws.addRow([item, ...recs.map(r => { const hit = r[sec.key].find(l => l.item === item); return hit ? hit.value : 0; })]);
        row.eachCell((c, n) => { if (n > 1) c.numFmt = CURRENCY; });
      }
      const sub = ws.addRow([`Subtotal — ${sec.label}`]);
      sub.font = { bold: true };
      recs.forEach((_, i) => {
        const c = sub.getCell(2 + i);
        c.value = items.length ? { formula: `SUM(${colOf(i)}${first}:${colOf(i)}${first + items.length - 1})` } : 0;
        c.numFmt = CURRENCY;
      });
      subtotalRows[sec.key] = sub.number;
    }
    ws.addRow([]);
    const adj = ws.addRow(['ADJUSTED BID']); adj.font = { bold: true, size: 12 };
    recs.forEach((_, i) => {
      const col = colOf(i);
      const c = adj.getCell(2 + i);
      c.value = { formula: `${col}${baseRow.number}+${col}${subtotalRows.missing_scope}+${col}${subtotalRows.required_allowances}+${col}${subtotalRows.known_additions}-${col}${subtotalRows.duplicated_scope}` };
      c.numFmt = CURRENCY;
    });
    const rank = ws.addRow(['Rank (1 = low)']);
    recs.forEach((_, i) => {
      rank.getCell(2 + i).value = { formula: `RANK(${colOf(i)}${adj.number},$B$${adj.number}:$${colOf(recs.length - 1)}$${adj.number},1)` };
    });
    const block = (label: string, pick: (r: BidRecord) => string[]) => {
      if (!recs.some(r => pick(r).length)) return;
      ws.addRow([]); ws.addRow([label]).font = { bold: true };
      const max = Math.max(...recs.map(r => pick(r).length));
      for (let li = 0; li < max; li++) {
        const row = ws.addRow(['', ...recs.map(r => pick(r)[li] ? '• ' + pick(r)[li] : '')]);
        row.eachCell((c, n) => { if (n > 1) c.alignment = { wrapText: true, vertical: 'top' }; });
      }
    };
    block('EXCLUSIONS', r => r.exclusions);
    block('QUALIFICATIONS', r => r.qualifications);
    const out = Buffer.from(await wb.xlsx.writeBuffer());
    const fn = `${project}_${trade}_Leveling`.replace(/[\\/:*?"<>|]/g, '-');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${headerSafeName(fn)}.xlsx"`);
    res.send(out);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// ---------- Buyout board: the newest buyout log, AI-structured into a per-trade status grid ----------
interface BoardRow { division: string; trade: string; vendor: string; amount: number | null;
  scope: string; negotiated: string; legal: string; ccip: string; executed: string; executed_date: string; notes: string }
const boardFile = (project: string) => path.join(CACHE_DIR, 'board_' + crypto.createHash('sha256').update(project.toLowerCase()).digest('hex') + '.json');

app.post('/api/buyout-board', async (req: Request, res: Response) => {
  try {
    const { project, refresh } = req.body as { project: string; refresh?: boolean };
    if (!project) { res.status(400).json({ error: 'project required' }); return; }
    if (!canAccess(reqUser(req), project)) { res.status(403).json({ error: 'No access to this project' }); return; }
    if (!refresh) {
      try {
        const cached = JSON.parse(fs.readFileSync(boardFile(project), 'utf8')) as { at: number };
        if (Date.now() - cached.at < 60 * 60_000) { res.json(cached); return; }
      } catch { /* no cache */ }
    }
    // Newest buyout log on the project's site (xlsx preferred, pdf fallback)
    const site = await resolveProjectSite(project);
    const hits: { driveId: string; itemId: string; name: string; modified: string }[] = [];
    for (const d of site.drives) {
      const r = await graph(`/drives/${d.id}/root/search(q='buyout log')?$select=id,name,folder,lastModifiedDateTime&$top=50`) as
        { value?: { id: string; name: string; folder?: unknown; lastModifiedDateTime?: string }[] };
      for (const it of r.value ?? []) {
        if (it.folder || !/buyout/i.test(it.name) || !/\.(xlsx|xlsm|pdf)$/i.test(it.name)) continue;
        hits.push({ driveId: d.id, itemId: it.id, name: it.name, modified: it.lastModifiedDateTime ?? '' });
      }
    }
    hits.sort((a, b) => (a.modified < b.modified ? 1 : -1));
    const src = hits.find(h => /\.(xlsx|xlsm)$/i.test(h.name)) ?? hits[0];
    if (!src) { res.status(404).json({ error: 'No buyout log found on this project\'s SharePoint.' }); return; }
    const { text } = await sharepointText(src.driveId, src.itemId, src.name);

    anthropic ??= new Anthropic();
    const msg = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5',
      max_tokens: 8192,
      system: 'You convert a Straticon buyout log into structured status rows. Return ONLY a JSON array: [{"division":"03","trade":"Concrete Shell","vendor":"KD Construction","amount":16473316,"scope":"YES","negotiated":"YES","legal":"PENDING","ccip":"PENDING","executed":"EXECUTED","executed_date":"03/10/26","notes":""}]. Use the log\'s own status words uppercased (YES, NO, PENDING, EXECUTED, APPROVED, N/A, or "" when the log shows nothing). amount is the negotiated/contract value as a plain number, or null. One row per trade line in the log; skip headers, totals and blank lines. Never invent values.',
      messages: [{ role: 'user', content: `BUYOUT LOG (${src.name}):\n\n${text.slice(0, 60_000)}` }]
    });
    const raw = msg.content.filter(c => c.type === 'text').map(c => (c as { text: string }).text).join('');
    let rows: BoardRow[] = [];
    try { rows = JSON.parse(raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1)); }
    catch { res.status(502).json({ error: 'Could not structure the buyout log — try Refresh.' }); return; }
    const out = { at: Date.now(), source: { name: src.name, modified: src.modified.slice(0, 10) }, rows };
    try { fs.writeFileSync(boardFile(project), JSON.stringify(out)); } catch { /* best effort */ }
    res.json(out);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Straticon Pre-Con running → http://localhost:${port}`);
  // Windows/Mac colleagues on the office network use this address:
  try {
    const os = require('os') as typeof import('os');
    for (const ifaces of Object.values(os.networkInterfaces())) {
      for (const i of ifaces ?? []) {
        if (i.family === 'IPv4' && !i.internal) console.log(`           on your network → http://${i.address}:${port}`);
      }
    }
  } catch { /* cosmetic */ }
});
