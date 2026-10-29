# Straticon Pre-Construction Studio

Internal AI tool for Straticon's preconstruction team. "Straticon ai" (Claude) reads project documents
from SharePoint/Teams and Autodesk ACC on its own, and helps with bid review, bid leveling, scope
tracing, GMP exhibits, scope templates, bid records, buyout boards and client-facing documents.
Accounts are built in (@straticon.com only, admin-managed per-project access).

Architecture and feature details live in `CLAUDE.md`. TypeScript only — `server.ts` (Express, tsx)
plus a single-file UI in `index.html`.

## Run it locally

1. Node.js 18+ (`node -v` to check).
2. ```
   npm install
   cp .env.example .env   # then fill it in (see below)
   npm start
   ```
3. Open **http://localhost:3001** (the boot log also prints the LAN URL for colleagues on the network).
4. First run shows **Create the admin account** — that account manages people & project access.

## Environment variables (.env — never commit)

| Variable | What it is |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |
| `CLAUDE_MODEL` | e.g. `claude-opus-5-5` |
| `APS_CLIENT_ID` / `APS_CLIENT_SECRET` | Autodesk APS app (Data Management API), authorized as a Custom Integration in ACC admin |
| `MS_TENANT_ID` / `MS_CLIENT_ID` / `MS_CLIENT_SECRET` | Entra app registration, application permissions `Sites.ReadWrite.All` (admin-consented; read works with `Sites.Read.All`, SharePoint saves need write) |
| `PORT` | 3001 |

## Deploying to Vercel

The app has a dual storage driver (`store.ts`): local files when run with `npm start`, **Postgres
when `POSTGRES_URL` is set** — which is what makes Vercel work (its filesystem is read-only and
nothing on it persists). `api/index.ts` + `vercel.json` are the Vercel entry points.

1. On vercel.com: **Add New → Project** → import this GitHub repo. Framework preset: **Other**.
   No build command needed (leave defaults; Vercel builds `api/index.ts` via `vercel.json`).
2. In the project: **Storage → Create Database → Postgres (Neon)** and connect it — this injects
   `POSTGRES_URL` automatically. Tables are created on first use; nothing to run by hand.
3. **Settings → Environment Variables**: add every variable from the table above
   (`ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, `APS_*`, `MS_*`). `PORT` is not needed on Vercel.
4. Deploy. First visit shows **Create the admin account**; then add the team under People & access.

Vercel limits to know about:
- **Request bodies are capped at ~4.5 MB** — large local-file uploads ("Add Files & Photos" with big
  PDFs) and many attached photos won't fit there; use the SharePoint/ACC attach flows instead, which
  stream server-side. Local `npm start` keeps the full 60–80 MB limits.
- Function runtime is capped (300s configured); very long agent turns with many visual PDF reads can
  hit it.
- Extraction caches live in `/tmp` (per-instance, ephemeral) — first reads after a cold start are slower.

**Migrating existing local data** (accounts, chats, projects, records) into the deployed Postgres is a
one-time step — ask Straticon ai's maintainer session to generate the import script when needed.

Render/Railway/Fly also work with zero extra setup (persistent process + disk, no `POSTGRES_URL` needed).

## Security notes

- `.env`, account/session files and all runtime data are git-ignored — keep it that way.
- The repo should be **private**: `docs/` holds Straticon's master extraction schema and
  `scope-inventory.md` contains project data.
- The browser never sees API keys; everything goes through server routes, and every `/api/*` route
  (except auth) requires a signed-in session.
