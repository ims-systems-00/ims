# iMS OS · Inventory & Asset module — developer specification

Version 2.0 · 19 November 2026 · iMS Tech Global

## 1. What is delivered

A production-structured module, not a mock-up:

| Part | File | Status |
|---|---|---|
| Front end (UI) | `public/index.html`, `public/css/module.css`, `public/js/app.js` | Complete; works standalone (localStorage) or against the API |
| Shared compliance rules | `public/js/rules.js` | Complete; pure functions, 10 unit-tested behaviours; used by browser **and** server |
| Data access | `public/js/store.js` | Complete; `LocalAdapter` and `RestAdapter` with intent-level actions |
| Reference API + scan route | `server/server.js` | Complete for the contract; file-backed store and demo auth to be swapped for platform ones |
| API contract | `openapi.yaml` | Complete |
| Tests | `server/test/*.test.js` (18) | Passing on Node 18+ |
| Sample tenant | `public/data/seed.json` | 17 assets, 6 stock lines, relative dates |

Run: `npm start`, `npm test`. Integration steps are in `README.md`.

## 2. What auditors and regulators look for, and where the module answers it
, and where the module answers it

| Standard / regulation | Requirement | Where |
|---|---|---|
| ISO 9001 7.1.3 Infrastructure | Equipment identified, maintained, records | Asset register; Planned maintenance checks; History |
| ISO 9001 7.1.5 Monitoring & measuring resources | Calibrated at intervals, traceable, identified, safeguarded; validity of previous results assessed when found out of calibration (7.1.5.2) | Category "Measuring & test equipment"; Calibration check with lab and certificate ref; Fail → Quarantined with a logged note to assess impact; Auditor pack §2 |
| ISO 9001 7.5.3 Records | Retained evidence | History (append-only audit trail); Disposed assets kept |
| ISO 14001 8.1 Operational control | Environmental plant checked; waste disposed lawfully | Category "Environmental plant"; disposal routes with waste transfer evidence |
| ISO 45001 8.1 Operational planning | Work equipment safe, inspected, defective equipment removed from use | Category checks below; "Do not use" on scan; fault report moves asset to Under maintenance |
| ISO 27001 A.5.9 Inventory of information assets · A.7.14 Secure disposal | Information assets owned, inventoried; media sanitised before disposal | "Information asset" flag; custodian mandatory for info assets; disposal of an info asset requires a data-wipe/destruction certificate reference |
| LOLER 1998 reg 9 | Thorough examination 6 months (lifting people/accessories) / 12 months | Lifting equipment: Thorough examination every 6 months (configurable) |
| PUWER 1998 | Maintenance, inspection, guarding | Production machinery: Planned maintenance + Guarding inspection |
| PSSR 2000 | Written scheme of examination | Pressure systems |
| BS 5306-3 / RRFSO 2005 | Extinguishers serviced annually, visually checked monthly | Fire & safety |
| EAWR 1989 / IET CoP | Portable appliance testing at risk-based intervals | Electrical appliances |
| COSHH reg 9 / HSG53 | RPE thorough examination monthly, face-fit | PPE & RPE |
| Road Traffic Act / DVSA | MOT, service, daily walk-round | Vehicles |
| WEEE Regulations 2013 | Electrical waste via licensed carrier with evidence | Disposal routes and evidence field |

The Overview's *Audit readiness* panel evaluates ten of these live (array `R` in `render()`).


## 3. Functional scope

**Asset register** — unique tag, name, category, location (`Site · area`), custodian, lifecycle stage, criticality, make/model/serial, purchase date and cost, supplier, warranty, information-asset flag, safety notes (shown on scan), label-printed flag. Search and filters by category, stage, site, issues. Validation: tag format and uniqueness, category, stage, criticality, location, custodian for active assets.

**Lifecycle** — Requested → Procured → Commissioned → In service ⇄ (Under maintenance | Quarantined) → Retired → Disposed. Retired/Disposed require reason + approver; Disposed requires route + evidence; information assets require a wipe/destruction certificate reference. Every move writes a history line.

**Checks** — each category defines its checks `[name, intervalMonths, basis]` (interval 0 = each-use, recorded by exception). Tenant overrides via `settings.categoryOverrides`. Next due = last result (or purchase date) + interval; states `none / over / soon / ok` with `settings.leadDays`. Results: Pass / Pass with observations / Fail · quarantined; Fail → Quarantined with the ISO 9001 7.1.5.2 assessment note; a later Pass returns to service. Results carry who, date, reference and optional document id; dates cannot be in the future.

**Scan mode** — `GET /a/{tag}` → module in scan mode: one mobile card with OK-to-use / Do-not-use, notes, location, custodian, last/next checks, last activity, and actions: report fault, record each-use check, move location, confirm sighting, record result (inline form). Anonymous read; actions attributed to a name given once per device (`X-Scan-Name`) or to the signed-in user. Tenants can require login for actions.

**Stock** — code, item, location, qty, min/max, batch, expiry; movements issue / receive (with batch + expiry) / count / quarantine / dispose; states `low / expired / expsoon / ok`; low → purchase task.

**Overview, compliance map, auditor pack** — KPIs, needs-attention list in severity order, ten live readiness checks, 90-day activity, Alice summary; per-category control map; six-part auditor pack (register, calibration status, statutory inspections, disposals, consumables, self-check), printable.

**Exports** — register CSV (with QR URL per asset), schedule CSV, JSON.

**Cross-device sync** — `GET /model` carries a `version`; the client polls every 20 s and on tab focus; a phone's scan action is visible on the desktop within that window. Replace with the platform's realtime channel if one exists.

## 4. Data model

See `openapi.yaml` → `components.schemas` (Asset, StockItem, Settings, Model). History is append-only, newest first; `checks` is keyed by check name; `disp` holds the retirement/disposal record.

## 5. Rules to keep server-side

All in `rules.js`: `checkRows`, `nextDue`, `issues`, `okToUse`, `applyResult`, `recordEachUse`, `reportFault`, `moveLocation`, `validateStageMove`, `moveStage`, `validateAsset`, `applyStockMove`, `stockState`, `readiness`, `registerCsv`, `scheduleCsv`. The server calls these; the client calls the same functions only to show errors before a round-trip (LocalAdapter) or not at all (RestAdapter).

## 6. Roles and permissions

| Role | Can |
|---|---|
| viewer (any signed-in user, or anonymous scan) | read register, scan card, auditor pack |
| staff (employees; anonymous scan with a name if the tenant allows) | fault, move, each-use check, sighting, stock movements |
| competent (named competent persons, approved contractors) | record results with certificates |
| manager | create/update assets, stage moves, settings, stock items |

Competence should come from the Training module: a result for `Thorough examination` is accepted only from a person whose competency record covers lifting equipment.

## 7. Integration with the rest of iMS OS

Suppliers (`sup`, calibration labs must be approved with UKAS schedule), Documents (`fileId` on results), Risks & incidents (Fail or fault → NCR), Training (competent role), Remote audit (auditor pack + scan route in the auditor view), Alice (`/readiness`, `issues()`), Finance (fixed-asset export from `cost`, `pdate`).

## 8. Non-functional

No dependencies, no build; ES2019; UTC date maths; append-only history; 422/403/404 error contract; path-traversal-safe static serving; body limit 2 MB. Accessibility: labelled inputs, keyboard-operable rows and labels, `role="dialog"` drawer, live-region toasts. Print styles for labels and the auditor pack.

## 9. Open decisions for the product owner

1. Default LOLER interval: 6 months (lifting people/accessories) vs 12 months — shipped as 6, overridable per tenant.
2. Anonymous scan actions on by default, or login required (per tenant).
3. Whether a Fail on a measuring instrument should automatically raise an NCR in Risks & incidents (recommended).
4. Label stock: 50 × 25 mm vs 70 × 35 mm polyester; QR at ≥ 20 mm.
