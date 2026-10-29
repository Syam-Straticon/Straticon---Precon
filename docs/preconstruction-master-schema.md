# Straticon Pre-Construction Card — Master Extraction Schema
Synthesized from 7 of Matt Gaston's precon projects (Seacoast, Manor Cypress Creek, Rio Marine Village, Wilton Manor, Little River 1-2A, Avery Cypress Creek, Rivertowne Square). Full per-project detail: matt-projects-scope-schemas.md.

## 1. What the tool actually is
Not "fill one template." Matt runs a **GMP preconstruction advisory workflow**. The common engine across all projects:

**Subcontractor proposal / scope document IN → normalized structured record OUT → records feed leveling, exhibits, logs, and position memos.**

Core unit of data: the **per-proposal Bid Review Record** (Rio's 28-field "Bid Review Standard" ≈ Rivertowne §5 ≈ Little River §H — near-identical across projects).

## 2. Master Bid Review Record (the extraction target)
### Identity
bidder/vendor name, contact, estimator, addressee · proposal/quote #, revision, date, superseded versions · trade / CSI division · Straticon cost code (NN.NNNN.NN) · bid package / Exhibit-D line · phase/area/building split · prequal, SDI eligibility, bond requirement, related-party flag

### Design basis
drawing set + date priced (blank = flag) · sheets cited · spec date · addenda acknowledged · match vs current drawing log (current/superseded/missing) · post-pricing design changes + source

### Pricing
base bid + breakdowns (building/area/phase/level) · line items (desc, qty, unit, rate, extended) · alternates (add/deduct, separate from base) · allowances in bid (flag for conversion) · unit prices, T&M, labor/standby rates · taxes, bonds %, insurance (OCIP/CCIP), freight, hoisting, equipment, layout, engineering, permits, testing, temp work, cleanup, mobilization, supervision, closeout · deposits (%, timing, what locked) · escalation (price-hold date, index/band/cap, tariffs: country, HTS, rate) · normalized metrics ($/SF, $/unit, $/LF, $/space, $/fixture/door/window/opening)

### Scope coverage
inclusions · exclusions (general + item) · qualifications/assumptions · "by others" (sub/GC/Owner/A-E/utility/tenant) · scope-sheet item responses (✔/✗/silent) · delegated design + PE stamps · permit responsibility · missing scope (vs drawings/specs/scope sheet/other bidders) · duplicated scope / double-carry (across bidders AND vs other budget lines or allowances) · internal conflicts (priced add vs own exclusion) · package boundary items

### Quantities
three-way check: bidder qty vs Straticon takeoff vs drawing schedule · unit, source sheet, variance, double-count flag

### Product/technical
mfr/model/system, or-equal status · Priced As (As Specified / Proposed Equal / Vendor Selection / TBD / Not listed) · FL FPA / NOA # + expiration · test ratings (wind psf, STC, missile, fire/UL) · config deltas · performance reqs

### Commercial terms
bid validity/expiration, holds through work window · payment terms, retainage · warranty term/transferability/start · lead times, delivery, storage & title · wage basis (Davis-Bacon/prevailing) · storm provisions · no-damage-for-delay / equitable-adjustment / precedence-claim clauses · schedule & labor assumptions (durations, crews, sequence, OT)

### Leveling (formula is universal)
**Adjusted Bid = Base + Missing Scope + Required Allowances + Known Additions − Duplicated Scope**
adjustment source tag: vendor price | other-bidder proxy | Straticon plug · leveled base, leveled VE, risk-adjusted (Tier 2) · rank, delta to low · valid-comparable flag · vs GMP carry: $/% variance, cause (design development / qty growth / market escalation / spec change / bidder assumption / leveling correction) · Required Reduction % = (Bid − Budget)/Bid

### Every extracted item carries (universal rules)
1. **Evidence tag**: confirmed/documented fact | bidder assumption | reasonable inference | requires clarification/confirmation
2. **Citation**: sheet #, spec section, proposal page/line, or email language
3. **Conflict handling**: two sources disagree → surface both, never pick one
4. **Supersession**: which source/revision replaces which, with dates
5. **Audience flag**: Owner-facing vs Straticon-internal (internal notes, buyout strategy, "do not send" never in deliverables; credentials never anywhere)

## 3. Output deliverables (per-project template mapping required)
Exhibit names/letters VARY by owner/contract — never hard-code:
| Deliverable | Seacoast | Rio | Wilton | Manor CC | Little River |
|---|---|---|---|---|---|
| SOV / budget | C.1 | Exh D | A.1 | GMP estimate (CSI × area) | SD Budget SOV |
| Allowances | C.2 | Exh B | A.2 | Allowance Log | in Q&A/BOE |
| Qualifications/Clarifications | C.3 "Q&As" | Exh G | A.3 | Exhibit Q&A | Q&A/BOE → GMP C&A |
| Schedule | C.4 | Exh C | — | — | — |
| Drawing log | C.5 | Exh E | A.5 | sheet logs | — |
| Alternates | Alternates Log | Exh F | A.4 | Alternates Log | in Q&A/BOE |
| Tariff sub list | — | Exh K | — | — | — |

Common exhibit drafting rules (verbatim-consistent across projects): entries 1–3 sentences, plain construction language; banned legalese ("notwithstanding...", "to the fullest extent...", "without limitation"); risk-allocating lines flagged (†) for legal review, not drafted; each exhibit communicates: included / excluded / pricing assumptions / allowances carried / incomplete design / outstanding Owner decisions / conditions affecting cost-schedule.

Other recurring outputs: bid leveling workbooks (Summary|Leveling|Clarifications|Basis tabs; blue=input yellow=illustration convention), RFI drafts (Question/Context/Impact; rated Legitimate | Low priority | Already answered | Likely rejected), six-heading review memos (Confirmed Facts | Straticon Exposure | Owner Exposure | Open Issues | Recommended Position | Dollar Exposure), estimate deltas (what/why/$ impact/qty impact/driver/confirmed-vs-assumption), VE evaluations (savings class: confirmed|ROM|potential|study), Owner communications (Current Budget|New Pricing|Variance|Reason|Next Step), scope-tracing position memos (Avery pattern: evidence chain utility→EWA→GMP→drawings→bids→subcontract→RFI), action trackers (Monday.com 13 fields), Q&A log + open-items register (resolved items migrate into clarifications text).

## 4. Workflow behaviors the card must support
- **Revision lifecycle**: Rev 0→1→2, supersession tracking; Director marks up, tool applies edits (editing workflow, not one-pass)
- **Routing rules** (Wilton pattern): excluded items → Q&A exhibit never SOV; unaccepted alternates → alternates log only; renumbering cascades cross-references; conflicts → separate issues list, never exhibit text
- **Markup math** as config per project: fee %, contingency %, SDI, CCIP, bond, application order; circular-insurance closed form Ins% × (Cost+Fee)/(1−Ins%); markup basis conflicts flagged
- **Decision checklists** as prompts: Owner-request 7 questions, early-buyout 10 questions, buyout-savings 8 classes, buyout readiness
- **Risk classes**: HIGH / MEDIUM / LOW per Rivertowne §22 definitions
- **Gap + double-carry detection** across the whole project, equally weighted
- **Contract structure is per-project config** (A104+Exhibits A–K vs A102/A201 Early Works + GMP Amendment)

## 5. Source documents (what the Autodesk/APS integration must reach)
Drawings by set/building/discipline + revisions · Project Manual/specs · reports (geotech, drainage, acoustical, COMcheck, RAR, flow tests) · sub proposals (PDF) in Subcontractors\<Div-Trade>\Proposals\ · scope sheets + leveling workbooks (.xlsx) · GMP estimate + buyout log · contract + exhibits (.docx, tracked changes) · schedule (.mpp) · RFI logs · Owner emails (.msg) · takeoffs (Bluebeam) · utility correspondence.
Folder conventions are consistent: Project Files\Subcontractors\NN - Trade\{Proposals|Scope|Leveling}\, Owner('s) Contract\GMP\Exhibits\, Budget\, Claude outputs\.

## 6. Still needed from Matt
1. **Rivertowne Square Phase I C&A (05.19.26)** — the real template Little River was built from (absent from every project)
2. Straticon trade scope sheet template ("Matt's template" .xlsx)
3. A filled example of each exhibit type (one Seacoast C.1–C.5 set or Wilton A.1–A.5 Rev 2 set)
4. One real sub proposal PDF + its leveling workbook as a test pair
5. Marina Mile schema (not collected)

## 7. Recommended build order for the Pre-Construction card
1. **Proposal → Bid Review Record** extractor (PDF proposal in, §2 record out, evidence-tagged) — the universal engine
2. **Leveling view** — records side by side, adjusted-bid formula, clarifications list
3. **Exhibit generators** — per-project template config fills Q&A/allowances/alternates/drawing log from records
4. **Project Q&A / scope tracing** — "who carries X?" answered from the record database with citations
5. Autodesk APS integration to pull source files automatically
