# Matt's Pre-Construction Projects — Scope Extraction Schemas
Collected project-by-project from Matt Gaston's shared Claude projects.
Purpose: build the master extraction schema for the Straticon Pre-Construction card.

Status:
- [x] Seacoast — received 10/27/26 (full detail below)
- [x] Manor Cypress Creek — received 10/27/26 (full detail below)
- [x] Rio Marine Village — received 10/27/26 (full detail below)
- [x] Wilton Manor — received 10/27/26 (full detail below; file naming confirms "Generation Wilton Manors")
- [–] Marina Mile — not collected (user ended collection 10/27/26)
- [x] Little River Phase 1-2A — received 10/27/26 (full detail below)
- [x] Avery Cypress Creek — received 10/27/26 (full detail below)
- [x] Rivertowne Square — received 10/27/26 (full detail below)

---

## SEACOAST

### Purpose
GMP that Straticon can sign without unidentified scope gaps; staged as Early Works agreement → GMP Amendment. Every scope item in current drawings/specs must be assigned to: subcontractor / GR-GC / allowance / alternate / Owner / explicit exclusion.
Not a single filled template — an advisory workflow producing: bid leveling workbooks, scope sheets & pricing forms, GMP contract exhibits (C.1 SOV/budget, C.2 Allowances, C.3 Q&As, C.4 Schedule, C.5 Drawing Log, GC/GR Breakdown, Alternates Log; B.1–B.6 amendment equivalents), RFIs (priority-rated), estimate reconciliations, owner summaries/RFA letters/emails.

Core extraction record per trade/package: inclusions & exclusions, drawing set basis, price & terms, gaps/double-carries/design conflicts, which contract exhibit item it feeds.

### Templates
No blank template in project files. Named external templates: "Exhibit B- GMP Amendment Template.docx", "AIA Exhibit A - Modified - CCIP.docx", Avery Cypress Creek Exhibit E template (12.15.25, basis for C.3 layout), RFI 028 template, Straticon light fixture pricing form (3 versions), Straticon scope sheet format, Lighting Controls Scope Checklist format.

Key exhibit structures:
- **C.1 SOV & Budget (xlsx)**: tabs C.1 SOV / Basis & Calcs / Sitework Detail / GMP Reconciliation. Columns: Item # | Cost code | Description | Basis | Amount. Summary rows: Cost of Work, Contingency, GCs, Fee, SDI, CCIP, NTE Amount. Header logo/date/title band; footer page x of y + initials.
- **C.2 Allowances (xlsx)**: C.2 Item | Cost code + description + scope basis | linked C.1 Item | Amount | Total. 6 numbered Conditions (complete-cost basis; markups in C.1; billed actual cost, over/under by CO; overruns not from contingency; notify Owner before exceeding; unreconciled balances carry to GMP Allowance Log).
- **C.3 Q&As (docx)**: header block; sections: Project Summary, General Qualifications, Division 1, trade sections (Inclusions/Exclusions/Qualifications per C.1 line), Work Not Included, General. Continuous numbering; initials footer.
- **C.5 Drawing Log (xlsx)**: Section/Building | Sheet No. | Sheet Title | Rev # | Set | Drawing Date | Received Date. Rules: rev/date = latest title-block revision; Received = Straticon stamp.
- **Alternates Log (xlsx)**: OPT # (.1 sub-options) | Description | Unit | Sub cost (+/–) | markup chain (Contingency → Fee → SDI on COW+contingency → CCIP on total) | Total | Status | Ball-in-court | Comments/decision deadline | Backup ref.
- **GC/GR Breakdown**: cost code | description | GC/GR category | qty | unit | rate | months | total | basis. Owner-facing + internal revision log.
- **Bid Leveling workbook**: Leveling tab blocks A Base as submitted / B Leveling adjustments / C Leveled base / D VE alternates / E Leveled VE / F Other options / G GMP check; plus Key findings, Base vs Spec, VE Alternates, Open Items, Basis tabs.
- **Bidder Pricing Form**: SUMMARY (vendor info, section totals, deducts, warehousing, confirmations, tax) / SPEC (Tag, Qty, Spec mfr/catalog, Priced As, Proposed Mfr/Catalog, Comments, Unit/Ext price) / VE tabs.
- **RFI (docx/pdf)**: RFI No. | Title | To/cc | Narrative | Numbered requests | Attachment | References | Ball in court | Reviewer | Cost impact | Schedule impact. No pricing in RFI; internal ratings kept separate.
- **Owner Comment Response Log**: Ref | Owner comment | Straticon response | Action → Owner decisions + next steps.
- **Scope Sheet**: numbered scope items with ✔/✗/silent per bidder, "by others", add-alternates.
- Also: Spec Deviation Summary (no dollars; internal notes separate), Takeoff Reconciliation, Options Leveling, Buyout Log, RFA/approval letters.
- Named but undefined: Responsibility Matrix, Scope of Work Exhibit.

### Scope fields (21 categories, condensed)
1. **Document/revision basis**: set name+date, building, discipline, sheet no/title, rev #/date, received date, on-index flag, spec section, change docs (Addendum/ASI/Bulletin/RFI resp), superseded flag, set bidder priced (blank = flag).
2. **Package ID**: CSI division, Straticon cost code (##.####.##), package name, area split (HQ/Garage/Site/Landscape/Drive-thru/Level), phase, contract bucket (Early Works/GMP Amendment/Owner-direct), early-release flag, buyout stage (bid→leveled→recommended→RFA→approved→LOI/awarded), projected buyout date, # bids.
3. **Proposal header**: bidder, proposal #/rev/date, validity/expiration, addressed to GC or Owner, budgetary vs firm, related-party flag, certifications.
4. **Pricing**: base bid + breakdowns, alternates/VE/options/allowances, unit prices, labor/T&M rates, daily/extension rates, deposits, sales tax (rate/base/included), freight, warehousing, bond %, CCIP credit, escalation (price-hold date, mill release, delivery window, tariffs), priced qty/units.
5. **Scope coverage/terms**: inclusions, exclusions, clarifications, qualifications, assumptions, "by others", scope-sheet item responses (✔/✗/silent), delegated design, permits, testing, mobilizations, equipment/hoisting, temp works, means & methods, labor assumptions, schedule assumptions, access requirements, warranty, payment terms/retainage/venue/LDs, precedence claims.
6. **Product/spec compliance**: tag/type, spec mfr/model/catalog, basis of design, Priced As (As Specified/Proposed Equal/Vendor Selection/TBD/Not listed), proposed mfr/catalog, config deltas (size/voltage/CCT/CRI/optics/finish/mounting/battery), substitution required, listings (FL approval, FM/UL, uplift), performance reqs.
7. **Quantities/takeoff**: tag, location (level/room/door), qty, unit, dims (W/H/LF/SF), type split, takeoff vs drawing vs bidder qty, set-to-set delta, double-count flag.
8. **Leveling outputs**: base as submitted, adjustments (desc/amount/source: vendor price|other-bidder proxy|Straticon plug), leveled base/VE, delta to low, rank, GMP carry, variance $/%, negotiation needed, potential VE, remaining exposure, breakeven, scope-complete flag.
9. **Gaps/interfaces**: gap ID/desc, trades between, furnish vs install, carried by (trade/GR/allowance/Owner/nobody), double-carry flag, recommended assignment, cost est, action. Interface checklist: disconnects, FA at HVAC, controls, LV power, sleeves/penetrations, structural supports, waterproofing/sealants/firestopping/blocking, pads/curbs, elevator interfaces, temp work, testing.
10. **Allowances**: number, cost code, description, amount, included scope, carried-elsewhere, billing basis, allowance vs NTE label, linked SOV item, carry-forward.
11. **Alternates/VE**: OPT #, description, source proposal/date, unit/qty, sub cost, markups, total, status, BIC, deadline, Owner decision, backup ref, already-in-GMP flag. VE criteria: cost/performance/appearance/schedule/warranty/code/maintenance/procurement risk/design impact. Net project VE. "Not VE" flag.
12. **Markups**: contingency, fee, SDI, CCIP, bond, GC, GR, sales tax rates + bases; precon fee; application order.
13. **GC/GR**: line items (cost code/desc/category/qty/unit/rate/months/total/basis), staffing %, governing spec, Owner-challenge flag.
14. **Schedule**: NTP, award dates, approval window, procurement/fab/delivery/erection dates, critical-path flag, phase milestones, dry-in/TCO/SC/FC, LD rates, price-hold expirations, temp-works durations, utility milestones.
15. **Design coordination/RFIs**: condition, sheets/details, conflicting doc pair, missing/undesigned items, clarification requested, rating/priority, consolidation group, RFI # (.1 follow-up), status, BIC, cost/schedule impact, response, internal buyout note (not in RFI).
16. **Code review**: code edition/section, occupancy, area SF, occupant load, egress, door/HW set, panic required, fire rating, ADA dims, required vs preference, AHJ approval.
17. **Owner-facing classification**: Known cost | Estimated cost | Potential exposure | VE opportunity | Design decision | Contractor recommendation | Open issue; pending decisions; Owner-direct; Owner-directed awards; audience flag (Owner-facing vs Internal).
18. **Permits/fees**: permit #, fee components + payee, impact fees, demo credit basis, MEP verification forms.
19. **Contract exhibit QA**: exhibit ID/version/date, redline author, blanks/placeholders, cross-ref errors, doc conflicts, precedence, attorney-review flag.
20. **Historical reconciliation**: prior carry + source, current carry + source, delta, driver (qty growth/spec change/scope add/design dev/labor esc/material esc/schedule/market/previously excluded), documented Y/N.
21. **Topic checklists**: interior storefront (panic hw, framed/frameless, occupant load), lighting (mfrs/equals/substitutions/controls/emergency/qty), garage interfaces, façade screening, canopy, elevators, generator, mechanical, electrical, plumbing — each with detailed sub-items.

### Source files
27 project .md working notes (secondary sources, roles: S=scope data, X=exhibit structure, R=reference). Primary inputs live outside the project, cited by path:
- Drawings/01 - Current Set/… (by set, building, discipline); Drawings/02 - Revisions/
- Project Manual (Spec Vol 1/2); Geotech, Drainage, COMcheck
- Subcontractors/[Div] - [Trade]/Proposals|Scope|Leveling Sheet/; 00 - Buyout Log/
- Budget/GMP/, Budget/GC-GR/, Budget/Value Engineering/
- Owner's Contract/Early Works Agreement/; RFI's/; Schedule/GMP/ (.mpp + C.4 PDF); Takeoff/, Scope/, Permit/, .msg emails

### Verbatim formats
Advisory answer: Conclusion / Why / Risk-Cost Impact / Recommended Action.
RFI body: condition identified → clarification requested → drawing/detail requested.
RFI rating: Legitimate-should submit | Worth asking low priority | Already answered | Likely rejected.
Email: Hi [Name] / issue+request+context / Let me know... / Thank you.
Owner categories: Known cost | Estimated | Potential exposure | VE opportunity | Design decision | Recommendation | Open issue.
Bid normalization buckets: Base bid | Alternates | Allowances | Exclusions | Clarifications | Qualifications | Unit prices | Escalation | Taxes | Bonds | Insurance | Freight | Hoisting | Engineering | Permits | Testing | Mobilization | Equipment | Labor assumptions | Schedule assumptions | Missing spec reqs.
Budget check: $ variance | % variance | negotiation required | potential VE | remaining exposure.
Notes file structure: # Topic – type (date, rev) / File-Workbook / Trigger-Status-Supersedes / Basis / Findings / tables / RFI draft+ratings / internal buyout notes / Open items / Next steps / Sources.

### Design notes for the tool
- Versioning: records keyed to document date + drawing-set basis; watch "Supersedes" and reversals.
- Audience field required: Owner-facing vs internal ("do not send", "not in RFI").
- Tag source of every leveled number (vendor / proxy / plug).
- Double-carry detection matters as much as gap detection.

---

## MANOR CYPRESS CREEK

### Purpose
GMP proposal to Owner (Related Development) for a multifamily project: PDF proposal + Excel estimate.
Contract exhibits required: Exhibit Q&A (Qualifications & Clarifications), Allowance Log, Alternates Log, Scope of Work Exhibits, Responsibility Matrices, GMP Assumptions & Exclusions.
Upstream deliverables feeding them: trade scope sheets (one per CSI division, .xlsx), Bid Form & Scope Checklist workbooks (one per bid package, 42 packages BP-01–BP-42), bidder RFI replies + Bidder RFI Log + Precon RFI Log to Owner, addenda (clarification/alternate tables), GC/GR breakdown, responsibility matrix (site furnishings), draft qualifications (TCO phasing).
Writing standard: short plain-construction-language entries, 1–3 sentences; risk-allocating items flagged for legal review (†), not drafted as legal text.

### Templates
No exhibit template in project files. Referenced/described structures:
- **Trade Scope Sheet (Matt's .xlsx template)**: Header; General Requirements; 1 General Overview; 2 Project Specific; area sections (Residential Base Bid / Residential Breakouts / Parking Garage / Hardscape-Landscape / Site); Breakouts by Area | Alternates | Unit Prices | Labor Rates | Exclusions | Insurance | Total Contract Amount.
- **Package Bid Form & Scope Checklist (.xlsx)**: BID FORM tab — Bidder Information | Base Bid by RFP Area (Sitework / Hardscape-Landscape / Parking Garage / Residential) | Cost Code Breakdown | Breakout Pricing (In Base: Yes / No-Add / Excluded) | Alternates/Unit Prices/VE | Allowances | Pricing Info | Schedule | Qualifications | Acknowledgment. SCOPE CHECKLIST tab — Plan Sets to Review | 15 General Items | Package Scope Items by Discipline | Shared Scope | Scope by Others.
- **GMP Budget (.xlsx)** tabs: SETUP, ESTIMATE, SUB ANALYSIS, GC-GR DETAIL, MILESTONE HISTORY, RESIDENTIAL BLDG DATA, GARAGE BLDG DATA, UNIT MIX.
- In-file reusable tables: Addendum clarification (# | Clarification | Applies To; # prefixes G-/A-/S-), Addendum alternates (Alt | Description | Applies To, priced separately w/ schedule impact in days), Draft qualifications (# | Qualification, † = risk line), Responsibility matrix (Tag | Item | Mfr | Qty | Mounting | Furnish/Install | GC support | Notes; grouped OWNER–LOOSE / GC–FIXED / OWNER–ART ON GC PEDESTALS / NOT ON SCHEDULE), Owner RFP responsibilities (# | Item | Resp. | Due | Status).

### Scope fields
1. **Estimate structure**: cost code (NN.NNNN.NN) + description, bid package BP-01–BP-42 (1:1 mapping w/ noted splits), RFP area split (Sitework/Hardscape-Landscape/Garage/Residential), CSI division, base bid by area, total contract amount, markups (fee %, contingency %, OCIP/CCIP %, SDI %, bond %), duration, cost per unit, cost per GSF, GC/GR lines (role, rate, % allocation, duration, cost).
2. **Quantities/basis**: GSF by building, unit count + mix (1/2/3BR), garage stalls, balcony SF, takeoffs (paving SF/SY, fence LF, earthwork CY), fixture/device counts (poles, bollards, drains, condensing units, elevators).
3. **Scope definition**: inclusions by discipline+area, exclusions, by others/Owner/Owner-furnished, shared scope & breakouts (item, candidate packages, in base/add/excluded), breakout matrix groups, furnish/install responsibility, delegated design, trade interfaces, possible double counts, scope not carried anywhere.
4. **Pricing mechanisms**: allowances (desc, amount, area, reason), alternates (#, desc, add/deduct, trades, schedule impact days), unit prices, labor rates, VE items (desc, credit, qty change), Owner Direct Purchase candidates.
5. **Design status/doc basis**: plan set, designer, issue date, revision, sheet count/log, design completeness by discipline (DD/permit/%CD/not designed), undesigned items, document conflicts (sheet-vs-sheet, discipline, geotech, Unit Standards), code basis (NFPA, FBC), product/NOA basis-of-design + expirations.
6. **RFIs/clarifications**: Precon RFI (RFI # | Discipline | Directed To | Plan Set:Sheet | Question | Priority | Date Issued | Response | Responded By | Date Answered | Status Open/Answered/Closed); Bidder RFI (# | Date | Bidder | BP | Question/Item | To Related? | Cross-ref | Addendum #); addendum clarifications; Owner RFP responsibility items.
7. **Assumptions/conditions**: GMP assumptions (soils, groundwater, contamination, ground improvement, pad prep), Owner-held items (permits/fees, testing, inspections, insurance, consultants), warranties (term, transferability, start date), attic stock.
8. **Schedule**: bid milestones (ITB, RFI deadline, addenda, bids due, leveling, GMP due), commencement + duration, phased turnover/TCO phases (levels, unit counts, amenities, dates, dependencies), long-lead items, utility energization, schedule conflicts.
9. **Bidder data**: name/contact, package, proposal date + document basis, stated exclusions, packages with no bidder.
10. **Risks**: cost drivers/risks, open items for Owner decision, open items for internal (Director of Precon) decision.

### Source files (all .md, prefixed claude_)
A. Primary scope (drawing-derived): GMP Bid Set Reviews — Architectural, Structural, MEP+FP, Site/Civil/Landscape/Aquatics/Geotech, Landscape-Hardscape Scrub, Package Scope Checklist Sweep (BP-01–42).
B. Trade scope sheets: Surveying, Dewatering (Div 02); Precast Garage, Tunnel Form (Div 03); Vibro Replacement (Div 31); Electrical+FA (Div 26).
C. Owner clarifications/addenda: Addendum 1 (ID drawings), Addendum 2 (clarifications + alternates), 10-20 GMP Coordination Call Minutes, 10-07 Geotech-Structural Call.
D. RFI logs: Precon RFI Log for Related, RFI Logs Updated from 10-20 Minutes, Bidder RFIs Q-11–Q-20.
E. Bidder RFI replies (~30 files by trade; structure: What the documents show / Log entries / Calls / Draft reply / Suggested addendum lines / Follow-ups).
F. Cost/GR: GC-GR Breakdown, GR Review vs Manor Biscayne.
G. Reference: GMP Setup Summary, Drawing Stage Assessment, EMS Sitework vs Geotech, TCO Phasing Review, Site Furnishings Matrix, Bidders List, Call Agenda.

### Formats
GMP estimate (Owner-accepted, per 10-20 Minutes §3): CSI Division rows × columns Sitework | Hardscape | Parking Garage | Residential | Total; + GR | GC | Bond | Insurance | Fee shown separately; + Cost per Unit | Cost per GSF; + Schedule | Logistics Plan | VE List | Alternates.
Target exhibits (inferred): Exhibit Q&A (# | entry 1–3 sentences | † flag); Allowance Log (# | Description | Amount | Area/Cost Code | Basis); Alternates Log (Alt # | Description | Add/Deduct | Amount | Schedule Impact days); Scope of Work Exhibit (per trade: Inclusions | Exclusions | By Others); Responsibility Matrix (Item | Furnish | Install | GC Support | Notes); GMP Assumptions & Exclusions (# | item).

---

## RIO MARINE VILLAGE

### Purpose
Straticon as CM-at-risk reaching a *deliverable* GMP: catch stale sub pricing, scope gaps, escalation/tariff exposure, buyout-savings terms that don't match real savings, and contract language shifting uncontrolled cost risk to GC. Signing the GMP is not the goal by itself.
No single deliverable. Recurring outputs: six-heading review findings (5A), bid leveling workbooks (base/leveled/GMP carry/risk-adjusted + clarifications), subcontract scope exhibits in Straticon's scope template (Div 32 documented instance), GMP exhibits (G Qualifications & Clarifications, B Allowance Log, F Alternates Log, Scope of Work, Responsibility Matrices, GMP Assumptions & Exclusions, K tariff subcontract list), contract redlines (.docx tracked changes), Owner/sub/RFI emails, SDI enrollment form fill.
Closest fit for the tool: proposal → per-bid review record (28 "Bid Review Standard" fields) → leveling sheet + scope exhibit → Exhibit G quals + allowance/alternate entries.
Contract-structure warning: instructions describe AIA A102/A201 (Early Works GMP + amendment) but all files use AIA A104 + Addendum + Exhibits A–K. **Don't hard-code either.**

### Templates
None in project files (22 .md session summaries). Referenced but not uploaded: Straticon subcontract scope template ("Matt's template" — numbered line-item checklists per trade, bidder-comment column), master trade scope sheets (e.g. HVAC), subcontract template by article, leveling workbook, Exhibit D GMP estimate workbook (SUB ANALYSIS + Milestone History tabs), Buyout Log (only cols L/M/N/O + Variance O=L−M−N documented), Exhibits B/F/K (.xlsx) + G (.docx), Vantage SDI enrollment form (only form whose filled fields are recorded).

### Scope fields
A. **Proposal header**: sub/vendor name, contact, estimator, proposal/quote #, date, rev #/date, resubmission, trade/CSI div, Exhibit D cost-code line (NN.NNNN.NN), prequal status, SDI eligibility, bond requirement, affiliate/related-party flag.
B. **Design basis**: drawing set + rev date priced, sheets cited, spec date, addenda acknowledged; match vs Exhibit E drawing log (current/superseded/blank); post-pricing design changes + source (Owner/design/tenant/third-party); drawing conflicts (plan vs schedule, sheet vs sheet, drawings vs Exhibit G); undefined items (RFI candidates); open/answered RFIs; delegated design.
C. **Scope**: inclusions/exclusions/qualifications/by-others; "our qualifications control" statements; location breakdown (building, unit type, phase, site/marina/ROW); scope-sheet lines checked/unchecked; responsibility (shell/interiors/Owner/tenant/utility); cross-trade: gaps, duplicates, multi-division proposals split across Exhibit D lines with different bidders.
D. **Quantities/specs**: counts by unit/door/fixture/equipment type; LF/SF/CY/EA/MBF/lb; three-way count check (bidder vs Straticon takeoff vs drawing schedule); mfr/model/or-equal; grades (psi, gauge, R-value), sizes, weights/loads, fire/wind ratings.
E. **Pricing**: base bid by building/section/line; unit prices; lump sum vs remeasure; alternates (#, desc, add/deduct, amount, status, who priced); allowances (#, desc, amount, Exhibit D line, basis, chargeable, overrun handling); cost components (taxes, bonds, CCIP/OCIP, freight, hoisting, equipment, layout, engineering/design/cancellation fees, permits, testing, temp work, cleanup); values (GMP carried, leveled Tier 1, risk-adjusted Tier 2, variance vs GMP/bidders, markup multiplier, credits); variance cause (scope change / market escalation / leveling correction).
F. **Commercial terms**: bid validity/acceptance window/expiration, price holds through work window; escalation clause (index, base value, band, one/two-way, cap); tariffs (country of origin, HTS, program, rate included, AD/CVD treatment); deposits (%, timing, amount, what it locks); payment terms, retainage, platform fees; storage & title, lead time, delivery/demurrage; warranty/maintenance/survival; equitable-adjustment, no-damage-for-delay clauses.
G. **Schedule/labor**: sequence, start/finish, durations, crews; NTP, commencement, mobilization, SC/FC, phase/turnover dates; milestones, testing/cert steps, long-lead, weather days, LDs; labor assumptions, union/prevailing wage, OT, make-up days.
H. **Contract/GMP review items** (verbatim 23): GMP definition; scope included; basis; contractor quals/assumptions; order of precedence; buyout savings; Owner participation in savings; Contractor participation; contingency; allowances; escalation; unforeseen conditions; Owner-directed design changes; Early Works costs; credits; CO rights; schedule commitments; design completeness; material escalation; labor escalation; sub default/withdrawal; bid expiration; scope incorporated by reference.
I. **Sitework checks** (verbatim 16): complete scope, quantities, earthwork assumptions, dewatering, utility scope, temp conditions, MOT, testing, export/import, unsuitable soils, rock, environmental, erosion control, bonds, escalation, schedule duration.

### Formats (verbatim unless noted)
**5A six-heading review**: Confirmed Facts | Straticon Exposure | Owner Exposure | Open Issues | Recommended Position | Dollar Exposure.
**5B Bid Review Standard (28 fields)**: Base bid, Drawing date, Specification date, Addenda, Scope inclusions, Scope exclusions, Qualifications, Alternates, Allowances, Unit prices, Taxes, Bonds, Insurance, Freight, Hoisting, Equipment, Layout, Engineering, Permits, Testing, Temporary work, Cleanup, Schedule, Escalation, Bid validity, Labor assumptions, Material lead times, Scope by others.
**5C exhibit drafting standards**: each exhibit communicates included/excluded/assumptions/allowances/incomplete design/outstanding Owner decisions/conditions affecting cost-schedule. Entries 1–3 sentences, plain construction terms; banned phrases: "notwithstanding anything to the contrary", "to the fullest extent permitted by law", "without limitation"; flag legal issues separately; flag any change to pricing/qty/dates/scope.
**5D structures (reconstructed, partial)**: Leveling workbook tabs Summary|Leveling|Clarifications|Drawing Basis; Summary cols: Bidder (proposal date)|Base|Leveled Tier 1|vs GMP|Risk-adjusted Tier 1+2. Exhibit B entry: Item|Division/Exh D line|Includes|Trigger|Overruns-underruns|Not included|Amount(basis). Exhibit F row: Item No|Exh D line+desc|Status|Amount + OPT #NN tab + numbered notes + "DATE: MM-DD-YYYY (REV...)". Exhibit K row: No|Exh D Line|Scope|Subcontractor|Tariff-Exposed Materials + K-1: Material|Country|Tariff program/HTS|Rate. Vendor terms: Vendor|Basis|Lock-hold|Payment terms. Deposit schedule G-[x]: Vendor|Scope|Deposit|Amount|Pay by|Locks|Balance. Buyout Log: Variance O=L−M−N. SDI form fields recorded.
**5E decision checks (verbatim question sets)**: Owner request (7 Qs — in GMP basis? design complete? price valid at execution? scope changed after? reduction backed by actual buyout? guaranteeing savings before they exist? credit without realized savings?); Early buyout (10 Qs — design sufficiency, price validity, leveling complete, contractual authority, redesign risk, qty growth, escalation post-release, alternates final, VE complete, schedule need); Buyout savings classes (8 — actual buyout savings, unused contingency, scope deletion, Owner VE, leveling corrections, allowance reconciliation, scope transfer between trades, risk-acceptance savings); Shell package checks (7); Marina electrical checks (6 — incl. 2022 vs 2026 drawings, scope growth vs escalation, CO entitlement protection).

### Source files
22 .md secondary analyses at /mnt/project/claude_<title>_<date>.md. Categories: bid leveling & scope reviews (9), GMP budget/allowances/alternates/tariff (6), contract negotiation/redlines (5), schedule (1), form fill (1).
Primary inputs (referenced, not present): sub proposals, leveling workbooks + trade scope sheets (.xlsx), Exhibit D GMP estimate + Buyout Log, Exhibits B/F/K (.xlsx), Exhibit G/A-104/Addendum/Exhibit A (.docx tracked changes), Exhibit C schedule + MS Project, Exhibit E drawing log, drawings + Bluebeam takeoffs, RFI log, responsibility matrix, Owner memos/emails, third-party docs, Exhibit H CCIP manual.
Exhibit map: A=Cost of Work/GC terms, B=Allowances, C=Schedule, D=GMP estimate lines, E=Drawings & Specs Log, F=Alternates, G=Qualifications & Assumptions, H=CCIP manual, K=Subcontract List (tariff).
Naming: RIO_Div NN_<Trade>_<Desc>_MM.DD.YY.xlsx|pdf; Rio Marine Village_Exhibit X_<Name>_MM.DD.YY[suffix]; version suffixes r1/CLEAN/OWNER REVIEW/DB Edits/JH revisions/Final Clean/Straticon redline. Folders: Project Files\Subcontractors\NN - <Trade>\{Leveling|Scope}\; Owner Contract\GMP\Exhibits\...; Project Files\Budget\; Insurance\.

---

## WILTON MANOR (Generation Wilton Manors)

### Purpose
Deliverable: five owner-contract exhibits A.1–A.5 under Exhibit A of an Early Works (Demolition) Agreement (Owner ↔ GC). Content: in-price / out-of-price, allowances, alternates, drawings priced from. Preconstruction view, not legal.
Pricing method: pricing exhibit mirrors one carried bidder's column from a multi-bidder demo breakout sheet; GC markups added on top.
Secondary output: separate open-items & conflicts list (issues flagged OUTSIDE exhibits, never written into exhibit text).
Revision control: Rev 0 → Rev 1 → Rev 2, each supersedes last. **Editing workflow, not one-pass form fill**: Director of Precon marks up a draft; assistant applies edits.
Format precedent: Seacoast C.1–C.5 set.

### Scope fields
- **Metadata**: project name, parent exhibit (A), exhibit # (A.1–A.5) + title, rev #/date/supersedes, file name/format, Owner legal entity, Contractor name, governing agreement + section refs, carried bidder + source bid date.
- **Bid comparison inputs**: bidder names (breakout sheet columns), line items + amounts per bidder, carried-bidder selection.
- **SOV (A.1)**: item #, item group (demolition / utilities / trees / site & temp controls / permits & general reqs / markups), description + amount, allowance flag → A.2 ref, unit-price flag + qty carried, Cost of Work subtotal, fee rate/amount, insurance rate/basis/amount, contract sum total, hourly-billed items outside total (w/ exhibit ref), agreement-fees-not-on-SOV reconciliation field.
- **Unit prices**: description, unit, unit price, qty carried in base.
- **Allowances (A.2)**: description, amount, A.1 item ref, total.
- **Alternates (A.4)**: alt # + description, base amount, amount w/ Fee & Insurance, acceptance status, A.1 ref, related A.3 bullets.
- **Q&As (A.3)**: bullet text, subhead keyed to A.1 item group, Work Not Included items w/ status (Not Included / Not Required / partially), "already covered elsewhere" indicator.
- **Scope boundaries/quantities**: demo limits by drawing ref, structure count in limits vs structures in bidder proposal, roadway/ROW areas, easements, utility POCs (cap locations/counts, meters, cleanouts), tree disposition/protection/relocation, paving/flatwork extent.
- **Drawings (A.5)**: sheet #, title, date/rev, which sheet supports which scope item.
- **Authority/permits**: permit #, department, reviewer, review status, comment #/text/date, timing requirement (before demo permit / before final zoning), responsible party, addressed-in-exhibits flag.
- **Correspondence**: date, author, recipient, scope-affecting statement, conflict with exhibits.
- **Owner decisions/open items**: issue, conflicting sources, $ delta, decision needed, owner, status.
- No schedule fields (only sequencing conditions from authority comments).
- **Never carry into exhibits**: vendor attributions, internal notes, allowance conditions, agreement/AIA restatements, unapproved new qualifications.

### Formats
File naming (verbatim): `Generation Wilton Manors_Draft_Exhibit A.{n}_Early Works {Title}_{MM.DD.YY}.{ext}` — A.1 SOV .xlsx | A.2 Allowances .xlsx | A.3 Q&As .docx | A.4 Alternates .xlsx | A.5 Drawing Log .xlsx.
- **A.1 SOV**: Item No | Description | Amount. Item groups: 1–2 Demolition; 3–6 Utilities (allowance + unit-price lines); 7 Trees (allowance); 8–10 Fence/entrances/SWPPP; 11–14 Permits/rodent letter/traps/toilets (allowance); 15–17 Management/insurance/fee. Totals: Cost of the Work | Fee | Insurance | Total. Note: management billed hourly per Exhibit B, outside Total.
- **A.2**: Allowance | A.1 Item Ref | Amount + Total. Omit allowance conditions.
- **A.3**: bullets 1–3 sentences, subheads keyed to A.1 groups, WORK NOT INCLUDED section (status Not Included | Not Required). Omit vendor attributions/notes/conditions/restatements.
- **A.4**: Alt No | Description | Amount | Amount w/ Fee & Ins | Status (Accepted/Not Accepted) | A.1 Ref. Unit prices: Description | Unit | Unit Price | Qty Carried.
- **A.5**: Sheet No ("CD-101") | Title | Date/Rev (minimum implied).
- **Calculation rules**: Fee = Fee% × Cost of Work. Insurance = Ins% × (Cost+Fee)/(1−Ins%) (circular, closed form matches Rev 2) — but agreement defines basis as Cost+Fee non-circular → **insurance basis is a config flag / known conflict**. Total = Cost + Fee + Insurance (hourly mgmt excluded). Alternates use same markup math.
- **Routing rules**: Not Included/Not Required → A.3 WORK NOT INCLUDED, never A.1 rows. Not-accepted alternates → A.4 only, excluded from A.1/totals. A.1 renumbering → update refs in A.2, A.3 subheads, A.4. Conflicts/open items → separate issues list, never exhibit text.

### Source files
Project holds only one .md status/memory log + drafting-standards instructions. Real sources (external): Demo Breakout Sheet 08/04/26 (pricing for A.1), Alpha Wrecking proposal Rev 1 (scope/structures), Draft Early Works Agreement (markups, mob fee, Owner entity), Exhibit B (hourly mgmt billing), drawings CD-101/CU-101/SP-101 + full A.5 set, Owner's draft Exhibit A (entity cross-check), City/Public Utilities permit comments, emails (owner's rep, City, sub), Director's markups (govern format), Seacoast C.1–C.5 precedent.

---

## LITTLE RIVER PHASE 1-2A

### Purpose
Precon assistant for a HUD multifamily project moving from SD budgets toward GMP. Multiple deliverables, not one pipeline.
Primary deliverable: **Q&A / Basis of Estimate (.docx)** — re-issued each budget cycle (Rev 0/1/2…); final version becomes the GMP Clarifications & Assumptions contract exhibit.
Secondary: estimate delta/reconciliation docs between cycles, design-option & VE ROM comparisons (e.g. facade options .xlsx), bid leveling + scope normalization, takeoff verification/backup, unit-type cost matrices, Owner-request action tracker (Monday.com), emails.
Extraction target: Q&A/BOE content — assumptions, clarifications, exclusions, allowances, alternates, Owner direction, open items + normalized sub-proposal data for leveling.

### Templates
None in project. **True template = "Rivertowne Square Phase I C&A (05.19.26)"** — the format precedent the Q&A/BOE was built from (request it!). Also referenced: Little River QA-BOE DRAFT 10.02.26.docx (Project Files\Claude Outputs\), facade option workbook, SD Budget SOV workbooks. Gap: Attachment A columns = ID, entry type, date, source, status, entry text; Attachment B = only ID + group defined.

### Scope fields
A. **Estimate/budget structure**: cycle ID + date, total budget, cost/GSF, cost buckets, markups (categories, rates, combined multiplier), contingency across cycles, SOV lines (row #, CSI cost code e.g. 03.3000.00, label, amount, Notes/Source text), SOV check rows + formula errors, superseded Notes/Source entries (old basis, new basis, superseding source + date).
B. **Clarifications & assumptions by CSI division** (Div 1, 02–33): text, basis doc + date, Owner-paid fees, bonds/insurance, FF&E responsibility, wage basis (Davis-Bacon/prevailing) for Straticon and each sub.
C. **Allowances & alternates**: description, amount, cost code/line, running total, coverage ("structure only"), alternate desc + amount.
D. **Exclusions/not carried**: not separately identified, not included, by Owner, cross-ref to open item (B-ID).
E. **Q&A log (Attachment A)**: ID A-01…A-nn, entry type (Owner question / Owner direction / Straticon request), date, source (email/minutes/response), status (open/pending/closed), text.
F. **Open items register (Attachment B)**: ID B-01…B-nn, group (Façade & Envelope | Structure, Site & Civil | Interiors, Specialties & Site Amenities | MEP, FP & LV | Project Requirements & Estimate), description, responsible party (Owner/A-E/sub/internal), resolution status. Lifecycle rule: resolved items migrate into division clarifications text.
G. **Q&A content categories** (verbatim): Assumptions | Clarifications | Exclusions | Design decisions | Open questions | Allowances | Owner direction | Items requiring A/E response.
H. **Bid leveling fields**: sub name, quote #/rev/date, proposal-header project-name mismatch check; base total, line items, vs budget line; scope desc + qtys, inclusions, numbered exclusions, internal conflicts (exclusions vs line items), in-bid allowances; design responsibility (design/engineering/drawings/calcs/PE stamps), permit responsibility; taxes, freight, equipment, hoisting, mobilization, supervision, testing, closeout; wage basis, normalized total, scope gaps, apparent-low-bid flag.
I. **Quantities/takeoffs**: element, qty, unit; derivation (counts × lengths etc.); source sheet; status (performed/missing/verified); assumptions flagged for confirmation.
J. **Unit rates**: rate/unit, source (sub/internal/material rates by vendor+date), confirmation status, unit premium between options.
K. **Unit-type breakdown**: unit type code (documented only — don't invent), count per type incl. accessible units, component costs (millwork, countertops, flooring, doors/hw, plumbing fixtures, appliances, other finishes).
L. **Delta/reconciliation**: item + cost code, prior/current/change; change class (qty change | pricing | scope | design | previously missed | intentionally excluded); explanation (what/why/$ impact/qty impact/driver/confirmed-vs-assumption); variance cause categories (quantity, structural design, masonry qty, concrete qty, estimate allocation, missing scope, pricing assumptions, inconsistent categorization).
M. **Design-option comparison**: option ID + rev (R.n), superseded revs, current direction (who/when), element-by-element differences, drawing ref + issue date per option, qtys w/ basis, unit rates, extended cost + difference, vs carried allowance (direct + w/ markups), unit premium, in/out scope. Facade dims: material, labor, CMU, framing, waterproofing, structural, finish, schedule, unit-cost basis, ROM vs sub-backed. Garage dims: dimensional changes, qty impacts, parking count, structural, cost, schedule/constructability, assumptions.
N. **VE evaluation** (verbatim): Estimated savings | Design impact | Constructability | Schedule | Procurement | Code implications | Maintenance/durability | Owner intent | Architectural impact | Risk transferred to Straticon | Design-team approval required. Savings class: Confirmed | ROM | Potential | Further study.
O. **Technical/performance criteria**: specified values (glazing U-value, SHGC, glass make-up), code refs, design criteria from reports (geotech, acoustical), conflicts between specified criteria and priced basis.
P. **Provenance & evidence (every field)**: citation (sheet # / spec section / bid page / email language); evidence class (Documented fact | Reasonable inference | Recommendation | Assumption requiring confirmation); conflict flag (surface both, never pick one); supersession (which source replaces which, date).
Q. **Action tracker (Monday.com, 13 fields verbatim)**: Action item | Date received | Source | Project/phase | Priority | Responsible person | Support person | Senior reviewer | Required date | Current status | Next action | Notes | Date completed. One accountable owner per item.
R. **Internal-only/redaction**: yellow-highlighted internal notes resolved before issue; credentials never in deliverables.

### Formats
Q&A/BOE outline: project summary + basis of estimate (cost-bucket table, markups); clarifications by division (Div 1, 02–33); allowances + alternates; general (bonds/insurance, Owner-paid fees, FF&E); Attachment A Q&A Log; Attachment B Open Items Register (5 groups). Header: Status (date): Rev. n [internal draft | issued] / File path / Built from. Revision practice: Rev per budget cycle; resolved B-items migrate to clarifications; final = GMP C&A exhibit.
Option comparison layout: header (title, R.n, date, workbook path, request, current direction, superseded revs); design-difference table (Element | Opt 2 | Opt 3); quantities w/ derivation; result table (Item | Opt 2 | Opt 3 | Difference); vs carried (direct + markups); unit premium; notes/open items.
Delta doc: What changed | Why | $ impact | Qty impact | Driver | Confirmed vs assumption.
Bid leveling (verbatim list): Scope | Quantities | Inclusions/exclusions | Scope gaps | Allowances | Design responsibility | Permit/engineering responsibility | Taxes | Freight | Equipment | Hoisting | Mobilization | Supervision | Testing | Closeout | Normalized total | Apparent-low-bid flag | Recommendation.

### Source files
In project: 2 .md working notes + instructions (schema source). Real sources (external): SD Budget SOV workbooks (current + prior), design recommendations memo, material rate sheets, BD allowance backup (missing), architectural/structural sheets, 100% SD civil set (+ superseded), outline specs, narratives, geotech + pile recs, acoustical report, sub proposals (PDF, multi-trade, revisions), Owner emails/responses, meeting minutes + follow-ups (contain credentials — exclude), Rivertowne Square Phase I C&A (template, absent).

---

## AVERY CYPRESS CREEK

### Purpose
Document Straticon's position **rejecting an Owner/developer credit request** on one disputed scope item (FPL vault secondary). Deliverable: internal position memo (Markdown), already written. Value to the tool: a worked example of **scope tracing** — following one item through every contract layer (utility design → EWA → GMP → drawings → bids → subcontract → RFIs), showing what evidence each layer provides.

### Scope fields
- **Dispute framing**: disputed item, requesting party + remedy (credit/deduct), responding position + basis, expected counterarguments (w/ sheet/doc each relies on), fallback contractual position.
- **Utility design records**: WR #, design/drawing dates (earliest vs current), service config (vault vs pad-mount), vault dims, transformer count/kVA/voltage, # services, temp vs permanent, correspondence (sender/recipient/forward chain/dates/quoted rationale/file path), fault-current letter date + voltage.
- **Early Works Agreement**: agreement/execution dates, Owner signatory, contract total, exhibit list (B=scope, C=drawing log), drawing log entries (title/date/WR #), inclusions w/ quantities (LF), exclusions, installation date, carry-into-GMP (SOV line, amount, matching A&C text).
- **GMP contract**: SOV/cost code lines + amounts, Exhibit E A&C (date, division, page, verbatim clause), Exhibit A drawing list (sheet #s, titles, rev #/date), order of precedence (governing article, rank of each doc), buyout variance clause (section, contingency treatment, savings split, timing).
- **Drawings**: sheet/title/rev/date, notes/callouts (text, location, count), schedules (connected loads by transformer), riser labels, sheet-vs-sheet conflicts + which controls, ASK sketches carrying conflicts forward (# + date).
- **Bid record**: bidder + bid date, base bid + breakdowns, each bidder's verbatim scope description for the item, source budget file + tab, leveling line # + per-bidder included flag, which bidder's language was adopted into contract A&C.
- **Subcontract (buyout)**: sub, execution date, value, inclusions, "By Others" exclusions, referenced docs (utility plans, as-builts), field conditions at buyout (work already installed).
- **RFIs/changes**: RFI #/date/subject, scope reassignment + recipient, stated cost impact, gap check (work outside all prior scopes), load-calc discrepancies (design load vs utility equipment size) → potential add/deduct.
- **Open items**: action, responsible, related RFI/drawing rev.
- Not present: alternates, allowances, schedule milestones, multi-division (Div 26 only).

### Format (memo structure, headings verbatim)
`# [Scope Item]: Owner Credit Request ([Mon Year])` → **Issue.** / **Straticon position.** → `## Evidence` (7 numbered items in order: utility design → EWA → GMP Exhibit E → contract drawings → bid record → subcontract buyout → current utility drawing; each = claim proved, detail w/ date/author/source, file path) → `## Where the developer will push` (conflicting sheets + characterization + which doc governs) → `## Fallback` (alternate contractual treatment, clause, financial mechanism) → `## Open items` (confirmations + RFIs w/ sub-actions).

### Source files
In project: claude_fpl-vault-secondary-credit-position.md (analysis output). Real inputs (external): FPL correspondence .msg, vault design drawings (orig + current), pad-mount drawing, fault-current letter, EWA + Exhibits B/C, GMP Agreement + General Conditions, GMP Exhibits A/E, electrical sheets E200A/E400/E-500/E-501 + ASK01, GMP budget workbook (tab "26 - Electrical"), 4 electrical bidder proposals, leveling sheet, electrical subcontract, RFI #64 + #133.

---

## RIVERTOWNE SQUARE (Phase 1)

### Purpose
Complete, defensible, market-supported GMP for Phase 1; find design gaps and sub scope exposure *before* contract, guided by "where could Straticon lose money later?" (Instructions §25). No single deliverable — a stream of one-off products triggered by Owner/A-E/internal requests: bid review/leveling (§5/§6/§24), bidder RFI log responses (.xlsx), ROM/cost build-up workbooks, option comparisons, drawing gap reviews + draft RFIs, scope/pricing request packages, meeting minutes/agendas, draft emails, marked-up drawing exhibits, Owner Pricing & Action Log entries.
Best extraction-tool fit: bid review + leveling — proposal in, normalized inclusions/exclusions/qualifications/pricing/terms out, compared to budget line.

### Templates
None in files (20 .md notes). Output structures defined verbatim in instructions §5, §6, §8, §9, §18, §22, §24 (below). Referenced not-in-project: Design & Precon Minutes .docx (iterative from No. 17 template: header block, section bars, action table, roster), Agenda .docx (from No. 13), Owner Pricing & Action Log .xlsx (ID, Status, Notes), Bidder RFI Log .xlsx.
Workbook tab conventions (observed): SUMMARY / COST BUILD-UP / RISKS & NEXT STEPS (+ variants: OUTLET COUNT, OWNER SUMMARY/NOTES & OPEN ITEMS, BUILD-UP/INPUTS/QUALIFICATIONS, Owner tab + Straticon Summary/Detail). **Blue cells = inputs, yellow = illustrations, live formulas. "Straticon internal" tab/section kept separate from Owner-facing.**

### Scope fields
A. **Proposal identity**: bidder/supplier, contact, addressee, trade/div + CSI cost code NN.NNNN.NN, proposal date/version/quote #/superseded, drawing set + date priced, phase/area (base vs breakout).
B. **Pricing**: base total; line items (desc, qty, unit, rate, extended); alternates separate from base; unit prices (add/deduct, extra footage, T&M, standby); allowances flagged for conversion to hard numbers; breakout lines; normalized metrics §21 ($/SF, $/unit, $/parking space, $/LF, $/fixture, $/door, $/window, $/opening).
C. **Scope coverage**: inclusions; exclusions (general + item); qualifications/assumptions; by-others (sub/GC/Owner/A-E/utility/provider); missing scope vs drawings/specs/scope sheet/competing bidders; duplicated scope (across bidders + vs budget lines); internal conflicts (priced add vs own exclusion); package boundaries.
D. **Quantities**: bidder qty vs Straticon takeoff vs drawing-scaled; unit, basis/source sheet, variance.
E. **Commercial terms**: validity date, escalation, lead time, schedule/sequence assumptions, permitting duration, bonds (P&P %, included?), insurance (OCIP/CCIP deduct, named insureds), sales tax, permits/fees, engineering/shop drawings/delegated design, prevailing wage/Davis-Bacon, delivery/hoisting/install/trash, storm provisions, standby, guarantees, warranty.
F. **Product/technical**: mfr/model/system, FL FPA / Miami-Dade NOA # + expiration, test ratings (STC, wind psf, missile impact, fire/UL), certifications, dims/capacities/electrical rating, material/gauge/thickness/finish.
G. **Leveling (§6)**: Adjusted Bid = Proposal + Missing Scope + Required Allowances + Known Additions − Duplicated Scope; valid-comparable flag (fails required spec e.g. NFOA, noncombustible sheathing).
H. **Budget comparison (§3/§18/§21)**: budget line code + amount (Concept / 100% DD / current), new pricing, $/% variance, reason, cause category (design development / qty growth / market escalation / spec change / bidder assumption), Required Reduction % = (Bid − Budget)/Bid.
I. **ROM build-up**: trade cost, design contingency %, GMP markup factor (GC/GR %), fee/P&P/CCIP gross-up, rounding increment, range low/high, scenarios, basis per line.
J. **Risk/follow-up**: priority HIGH/MEDIUM/LOW (§22 definitions), finding, cost/schedule risk, recommended action, **evidence tag: confirmed fact | bidder assumption | reasonable inference | requires clarification**, reference (dwg/detail/spec/proposal page), clarification questions, RFI (Question/Context/Impact §8), responsible/due/status (open/closed/carried).
K. **Drawing review checklist (§7)**: missing dims/details, arch-structural/civil-landscape/MEP conflicts, waterproofing transitions, firestopping, EJs, wall/roof terminations, equipment access, structural support, sleeves/embeds/blocking, access panels, fire ratings, drainage, condensate, envelope continuity, temp construction, utility conflicts, phasing/sequence.
L. **Package checklists**: garage §10, barrier cable vs crash wall §11, façade screening §12, drainage wells §13, roofing §14, window/door VE §15, buyout readiness §4 (design completeness, scope completeness, open RFIs, permit progress, price validity, escalation, lead times, sub capacity, contract risk, allowances, exclusions, schedule need).
M. **Meeting/action log**: action #, desc, owner, due, status, carried-from meeting #, closed-since, confirm-before-issue list.

### Formats (verbatim from instructions)
§24 detail table: Priority | Item | Finding | Cost/Schedule Risk | Recommended Action.
§24 bid review: Executive Summary (bid amount, leveled amount, budget variance, major risks, significant exclusions, recommended clarifications) → Detailed Scope Review → Pricing Review → Clarifications Required → Budget Impact → Recommended Next Steps.
§5 bid review requirements: Scope Included | Scope Excluded | Qualifications | Missing Scope | Quantity Differences | Pricing Differences | Allowances | Alternates | Unit Prices | Schedule/Escalation | Bonds/Insurance/Taxes | Clarifications Needed — evidence tag per item.
§8 RFI: Question / Context / Impact. §9 VE item: existing design, proposed VE, approx savings, design impact, schedule impact, risks, A/E approval required.
§18 Owner communication: Current Budget | New Pricing | Variance | Reason | Recommended Next Step.
§22 risk classes: HIGH = materially affects GMP/schedule/contract/constructability; MEDIUM = resolve before buyout but manageable; LOW = minor coordination.
De facto task-note structure: # Topic–date / Trigger / Files / What the documents show / Basis / Pricing-results table / Position / Open items (H/M/L + owner) / Straticon-internal (not in Owner email) / Next.

### Source files
20 .md notes (claude_<slug>-<MM_DD_YY>.md): 5 per-bidder scope digests (best test fixtures — structural demo, drainage test well, garage corridor deflection track ×4 bidders, clubhouse balcony EJ ×4 bidders, washer/dryer options), 5 ROM build-ups, 5 design reviews, 5 meeting records. Rules spec = project instructions §1–25 (in settings, not a file).
Real inputs (by path): sub proposals `Subcontractors\<NN - Trade>\Proposals\<Bidder>\Rivertowne_Div NN_<Trade>_<Bidder>_<Desc>_<MM.DD.YY>.pdf`; bidder RFI logs, 100% DD budget (.xlsx); 50% CD arch/struct/MEP/civil sets; outline specs; reports (RAR, geotech, flow tests); product data/NOAs; C&A exhibit, subcontract template, schedule; emails, meeting audio. Outputs saved under Project Files\Claude outputs\, \VE\, \Budget\, Meeting Minutes\, named `Rivertowne Square Ph1_<Topic>_<MM.DD.YY>.xlsx`.
