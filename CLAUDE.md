# Straticon Pre-Construction Studio

An internal AI tool for Straticon's preconstruction team. A chat agent ("Straticon ai") grounded in the
company's GMP buyout methodology reads project documents from SharePoint/Teams and Autodesk ACC, and helps
with bid review, bid leveling, scope tracing, and drafting GMP contract exhibits.

## Stack

- **TypeScript only — no Python.** Backend: `server.ts` (Express, run with tsx). Frontend: `index.html`
  (single file, vanilla HTML/CSS/JS, served statically by the server).
- Run: `npm start` → http://localhost:3001 (PORT in .env). Type check: `npm run typecheck`.
- `server.js` is a leftover pre-TypeScript version — ignored by the start script, safe to delete.

## Architecture

- `index.html` — entire UI: claude.ai-style sidebar — a 68px icon rail, position:fixed (so `.main`
  needs `grid-column:2`), expanding to 268px on hover (labels/.recents fade via .lbl spans), plus a pin button (#sidePin) that keeps it open — adds .pinned on .side and .sidebar-pinned on body (widens the grid column), persisted in localStorage; the click handler blurs the button or :focus-within would hold the rail open — with
  New chat, nav (Projects / Project files / Autodesk files) and a persisted Chats list (⋯ menu per row: inline rename — POST /api/chats {id,title} renames without messages — and a two-click delete; deletes are permanent and server-wide); chat (markdown renderer in `md()`; mid-stream a table block may arrive separator-first,
  so `md()` skips tables with no data rows); a right-side Sources popup (fixed pill top-right,
  hover-expands) that fills live from the SSE action events — tool activity shows there, not in the
  bubble; claude.ai-style Projects PAGES (not a modal): a cards grid with search and "+ New project"
  (name+description dialog), and a per-project detail page — its chats (filtered by chat.project),
  "Work in this project" (sets the composer context + starts a fresh chat), armed delete, and PROJECT
  KNOWLEDGE: description, instructions and up to 10 extracted text files, edited in place and saved to
  the server; view switching via showView('chat'|'projects'|'detail') toggling .center/.foot/.projpage, light/dark themes (dark-first, Linear/Vercel aesthetic); dictation via the Web Speech API
  (mic preflight through getUserMedia with noiseSuppression/echoCancellation/autoGainControl on, clear
  placeholder errors when blocked/missing, auto-restarting continuous recognition, EN·US / EN·IN chip
  persisted as precon.dictLang — needs Chrome/Edge/Safari and mic permission; the Claude browser pane
  blocks mics). Branding: assets/straticon-mark.png (sidebar rail, on a white tile) and theme-swapped wordmarks assets/straticon-wordmark-white.webp (dark mode) / -black.webp (light mode).
- `server.ts` — API proxy; all keys live in `.env`, never in the browser:
  - ACCOUNTS: every /api/* route except /api/auth/(login|setup|me) requires a session cookie (sid,
    HttpOnly, 7-day TTL, persisted in `.sessions.json`). Users live in `.users.json` (scrypt-hashed
    passwords, mode 600): {email (@straticon.com enforced), name, role admin|member, projectIds[] or
    '*', mustChangePassword}. First run (no users) → /api/auth/setup creates the founding admin via
    the in-page setup screen. Login has a 5-try / 10-min cool-off damper. Admin routes /api/users
    (create → temp password shown once, role, per-project access checkboxes, reset password, remove).
    ACL: /api/projects list/detail filtered by access, project create grants the creator access,
    project delete admin-only, /api/chat and /api/templates(+fill) refuse projects the user lacks.
    No SMTP yet, so password resets are admin-issued temp passwords; self-serve email reset is a
    future item. UI: full-page sign-in/setup card, account menu (Account settings with name +
    change-password, People & access admin panel, sign out); j() routes 401s to the sign-in screen.
    CAUTION (2026-10-29): a refactor script once truncated server.ts and it was reconstructed from
    session knowledge — keep backups before scripted edits on it.
  - `POST /api/chat` → Anthropic Messages API (via @anthropic-ai/sdk), STREAMING + AGENTIC: the route
    responds with SSE events — `delta` (text tokens), `action`/`action_update` (live tool activity),
    `clear` (wipes mid-turn text when tools run), `done` ({reply, actions}), `error` — a stop button
    aborts the fetch and the server aborts the model stream via res.on('close') (NOT req 'close',
    which fires once the request body is read) — and the client
    renders them as they arrive (rAF-throttled re-render of the markdown). Latency: all tool calls of
    a turn run via Promise.all (act() returns an index so parallel calls update their own Sources line),
    drive searches fan out concurrently, every request sends top-level `cache_control: ephemeral` so
    loop turns re-read the prefix from cache (per-turn usage logged to stdout as [chat]), the ACC index
    persists to .cache/accidx_*.json (30-min TTL, in-flight builds deduped), and site/ACC lookups
    pre-warm fire-and-forget when a project-scoped chat arrives. The agent rules tell the model to
    batch independent searches/reads in one turn. when a project is active, Claude gets four tools —
    `search_project_files`/`read_project_file` (SharePoint via Graph drive search) and
    `search_acc_files`/`read_acc_file` (Autodesk ACC) — and a loop (max 12 turns) runs them server-side,
    so Straticon ai finds and reads scope sheets/proposals/specs itself instead of asking the user to
    attach them. Project → site/ACC-project resolution happens server-side (`resolveProjectSite` /
    `resolveAccProject`, name match: exact > startsWith > includes, cached), so the model can never read
    another project's files. VISUAL PDF READING: the read tools take `visual: true` (and fall back to it
    automatically when a PDF has no text layer) — the PDF's bytes are attached to the loop conversation
    as a native `document` block (base64, ≤20 MB, appended AFTER the tool_result blocks in the same user
    message), so the model reads scanned pages/drawings/stamps itself. ACC search: the APS search
    endpoint's displayName filters silently match
    nothing, and its `data[]` entries are VERSIONS (included[] = items), so `accFileIndex` pages the
    unfiltered recursive search of "Project Files" (100/page, ≤50 pages, 10-min TTL cache) and filters
    names locally (all terms must match). The response includes `actions` (searches run, files read),
    rendered as a ✓-list above the reply. No project selected → no tools. System prompt = Straticon ai
    persona + master schema + agent rules + optional active project + attached document texts.
  - `GET/POST/DELETE /api/projects[/:id]` → shared project store in `.projects.json` ({id,name,
    description,instructions,knowledge[{name,text}],createdBy}; seeded with the 8 known projects on
    first read; POST creates (no id) or partially updates). /api/chat injects the active project's
    instructions and knowledge docs into the system prompt, so they ground every chat in that project.
    The old localStorage project list is gone. SHARING (claude.ai style): GET /:id/members returns
    {createdBy, members[{name,email,via: admin|all|shared}]}; POST /:id/share {email, remove?} — anyone
    with access can grant to an existing account, only admins can revoke (and '*'/admin access is
    managed in People & access, not here). UI: Share button + "Created by X · Shared with N people"
    subtitle on the project page, share dialog (avatar rows, role chips, armed remove ×), and the
    knowledge card shows a claude.ai-style capacity bar (% of the 10×150k-char budget) over file tiles.
  - `GET/POST/DELETE /api/chats[/:id]` → chat persistence: one JSON per chat in `.chats/`
    ({id, title, project, messages, createdAt, updatedAt}; title auto-derived from the first user
    message; the client saves after every assistant reply and restores project context on open).
    Saved messages are the client's text-only history — tool_use turns are not persisted.
  - Scope templates: `GET /api/templates?project=` (catalog: template/master/blank-named xlsx + the
    newest scope sheet per CSI division, from a paginated drive search for "scope"; 10-min cache),
    `POST /api/templates/fill` ({driveId,itemId,name,info} → ExcelJS loads the template, its cells go to
    Claude which returns JSON edits [{sheet,cell,label,value}]; formulas are never written; fill kept
    30 min in memory under fillId), `POST /api/templates/finalize` ({fillId,edits,action,fileName} →
    xlsx download (ExcelJS preserves template formatting), simple pdfkit PDF, or PUT back to the
    template's SharePoint folder — the SharePoint save needs the Entra app upgraded to
    Sites.ReadWrite.All (admin consent); it is read-only today and returns a clear 403 message).
    UI: + on the composer → menu (attach file / use template) → modal: pick → form+paste → review
    editable proposed values → Download .xlsx / Download PDF / Save to SharePoint (filename prompted).
  - `POST /api/extract?name=` (raw bytes ≤80 MB) → extractText for LOCAL uploads; the + menu's
    "Add Files & Photos" sends PDFs/Excel there, reads txt/md/csv/json/log client-side, and attaches
    photos (png/jpeg/gif/webp, ≤5 MB each, max 10) as base64 — image thumbnails in the composer,
    drag-and-drop onto the composer and clipboard paste both route through addLocalFiles(); on send,
    attachments move from the composer onto the sent bubble (claude.ai style) into chatDocs/chatImages,
    which keep riding every request so the context persists for the chat — /api/chat `images` puts them on the
    latest user message as vision blocks (json body limit raised to 60 MB for this). The + menu also
    has Attach SharePoint Files / Attach Autodesk Files (open the two file browsers) and the template
    picker.
  - `POST /api/document` ({title, project, markdown, format: docx|pdf}) → branded Straticon letter
    from a reply's markdown (headings/bullets/tables/bold parsed; docx lib for Word, pdfkit for PDF,
    STRATICON header + project + date + footer). The model also has a create_document tool (available with or
    without a project): when the user asks for a letter/report/file, it drafts ONLY the document,
    stored in `.gendocs/` (30-day sweep), announced over SSE as a `document` event and rendered as a
    claude.ai-style download card (marker `[[document:id|title]]` saved in the reply text so cards
    survive reloads; /api/document accepts {docId, format}). Replies without a card keep the hover
    "Export Word / Export PDF" buttons; the greeting chip "Client info request" prompts a formal
    outstanding-scope letter. Server boot also prints
    the LAN URL (http://<ip>:3001) for Windows/Mac colleagues on the network.
  - Bid Review Records: the model gets a `save_bid_record` tool (project chats) and the agent rules say
    to call it after every bid review — structured JSON per record in `.bidrecords/` (bidder, trade,
    division, base_bid, adjustment arrays missing_scope/required_allowances/known_additions/
    duplicated_scope as {item,value}, inclusions/exclusions/qualifications, alternates, terms, sources).
    Routes: GET /api/bidrecords?project= (list + computed adjusted bid), DELETE /:id,
    GET /:id/xlsx (ExcelJS record workbook). GET /api/leveling?project=&trade= builds the side-by-side
    leveling sheet — union of adjustment line items per section, per-bidder columns, LIVE Excel formulas
    for subtotals/adjusted bid/RANK, exclusions+qualifications blocks. Project page shows "Bid records
    & leveling" grouped by trade with Record.xlsx / Leveling sheet / delete.
  - `POST /api/buyout-board` ({project, refresh}) → finds the newest "buyout log" (xlsx preferred) on
    the project site, extracts it, Claude structures it to JSON rows (division/trade/vendor/amount +
    scope/negotiated/legal/ccip/executed statuses), cached 1h in .cache/board_*.json. Project page
    "Buyout board" section renders the status grid with colored chips + executed count + Refresh.
  - extractText also reads legacy .xls (SheetJS, installed from cdn.sheetjs.com tarball), Word .docx
    (mammoth) and Outlook .msg (@kenjiuno/msgreader) — wired into local uploads, knowledge files and
    the agent read tools.
  - OneDrive saves: `oneDriveUpload()` PUTs into the SIGNED-IN user's own OneDrive (Graph application
    permission Files.ReadWrite.All, admin-consented) under a "Straticon ai" folder, auto-created on
    first save. Wired as `to:'onedrive'` on /api/document (docx/pdf), action 'onedrive' on
    /api/templates/finalize, an OneDrive button on document cards, "Save to OneDrive" in reply hover
    tools, and "Save to my OneDrive" on the template review step.
  - `GET /api/autodesk/*` → APS Data Management API (2-legged OAuth, token cached).
  - `GET /api/sharepoint/*` → Microsoft Graph (client credentials, token cached). Sites → drives → folder
    children → file download.
  - `GET /api/autodesk/text` and `GET /api/sharepoint/text` → download file, extract text via the shared
    `extractText()` (pdf-parse v2: `new PDFParse({data})` then `.getText()`; exceljs for .xlsx/.xlsm —
    one line per row, cells joined with " | ", formula results not formulas, hidden sheets labeled;
    plus txt/md/csv/json/log), cache in `.cache/` — SharePoint keys are sha256(driveId|itemId) (a
    truncated base64 key used to collide across files in the same drive and poisoned the cache),
    Autodesk keys are base64url(versionId). `overrides.uuid` in package.json pins exceljs's uuid dep
    past a moderate audit advisory.

## Environment (.env — never commit)

ANTHROPIC_API_KEY, CLAUDE_MODEL (claude-sonnet-5-5), APS_CLIENT_ID/SECRET (Autodesk APS app, authorized as
a Custom Integration in ACC admin), MS_TENANT_ID/MS_CLIENT_ID/MS_CLIENT_SECRET (Entra app registration with
application permissions Sites.Read.All + Files.Read.All, admin-consented), PORT.

## Domain knowledge (do not lose)

- `docs/preconstruction-master-schema.md` — THE core asset: master extraction schema distilled from 7 live
  precon projects. Defines the per-proposal Bid Review Record (~90 fields), leveling formula
  (Adjusted Bid = Base + Missing Scope + Required Allowances + Known Additions − Duplicated Scope),
  evidence tags (documented fact | bidder assumption | reasonable inference | requires clarification),
  exhibit drafting rules (1–3 plain sentences, no legalese, † flags for legal), per-project exhibit naming
  (varies by owner: C.1–C.5 vs Exhibits A–K vs A.1–A.5 — never hard-code).
- `docs/matt-projects-scope-schemas.md` — per-project detail behind the master schema (Seacoast, Manor
  Cypress Creek, Rio Marine Village, Wilton Manor, Little River 1-2A, Avery Cypress Creek, Rivertowne
  Square; Marina Mile not yet mapped).

## Conventions

- Keep everything in TypeScript/JSON; the user explicitly does not want Python.
- The browser never sees API keys; new integrations go through server routes.
- Documents attached to chat are truncated client-side (150k chars) before sending.
- UI style: Straticon preconstruction theme — steel blue drawn from the company mark (--accent #a3bdd1
  dark / #46718f light), charcoal surfaces, a blueprint grid over .main (--grid token), primary buttons
  as a steel gradient with --btn-fg text, title-block rule lines on section headers, branded scrollbars.
  Light theme maintained in parallel via data-theme attribute + prefers-color-scheme; every color comes
  from the :root tokens.

- `scope-inventory.md` — generated report (Oct 28, 2026): inventory of all scope .xlsx files across the
  projects' SharePoint sites, counted per CSI division. Regenerate by re-running the scan rather than
  editing by hand.

## Known gaps / next steps

- Scanned PDFs are handled in chat via visual reading (see above), but the file-browser "attach" flow
  still fails on them (it only does text extraction).
- Projects in the sidebar are static defaults + localStorage; should eventually come from the live
  SharePoint/ACC project lists.
- Deployment: currently localhost-only; when the team needs it, deploy (Vercel/Render) and move .env
  values to host environment settings.
