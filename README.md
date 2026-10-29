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

## Deploying — read this first

**⚠️ Vercel will not work for this app as-is.** Vercel runs serverless functions with an ephemeral,
read-only filesystem, and this app persists everything to local files: `.users.json` (accounts),
`.sessions.json` (logins), `.chats/`, `.projects.json`, `.bidrecords/`, `.gendocs/`, `.cache/`.
On Vercel all of that disappears between requests — every deploy/invocation would wipe accounts and
chats, and the long-running SSE chat stream and in-memory session map don't fit the serverless model.
Making it Vercel-ready means replacing file persistence with a database/KV/Blob store — a real refactor.

**Use a host that runs a persistent Node process with a disk instead** — Render, Railway or Fly.io.
On Render (closest to zero changes):

1. New → **Web Service** → connect this repo.
2. Build command `npm install`, start command `npm start`.
3. Add a **Persistent Disk** mounted at the app directory's data path (the dot-files above live next
   to the code; easiest is mounting the service's working directory data dir and keeping defaults).
4. Set all the environment variables from the table above in the service's Environment settings.
5. The platform gives you HTTPS automatically — required, since the app uses password logins.

After the first deploy, open the URL and create the founding admin account, then add the team under
**People & access**.

## Security notes

- `.env`, account/session files and all runtime data are git-ignored — keep it that way.
- The repo should be **private**: `docs/` holds Straticon's master extraction schema and
  `scope-inventory.md` contains project data.
- The browser never sees API keys; everything goes through server routes, and every `/api/*` route
  (except auth) requires a signed-in session.
