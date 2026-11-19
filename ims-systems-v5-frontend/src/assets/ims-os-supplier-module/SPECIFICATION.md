# iMS OS · Supplier & Contractor module — developer specification

Version 1.0 · 19 November 2026 · iMS Tech Global

`index.html` is a complete, working front end (no build step, no dependencies). It runs against an in-browser store (`localStorage`, key `ims-suppliers-v1`) so the rules, screens and notifications can be used and tested today. To integrate, replace the three functions at the top of the script (`load`, `save`, and the `sample()` seed) with API calls; everything else (rules, derived states, auditor pack, notifications) is pure functions over the data model below.

## 1. What auditors look for, and where the module answers it

| Clause / standard | Auditor question | Where it is answered |
|---|---|---|
| ISO 9001 8.4.1 | Criteria for selection, evaluation, monitoring, re-evaluation | Criteria & settings (weighted criteria, interval by criticality, required documents) |
| ISO 9001 8.4.1 | Records of evaluations and actions | Evaluations tab per supplier; Auditor pack §3 |
| ISO 9001 8.4.1 | Who approved, when | `appby`, `appon` on each supplier; ASL export |
| ISO 9001 8.4.2 | Controls proportionate to risk | `crit` drives required documents, re-evaluation interval and the Conditional rule |
| ISO 9001 8.4.3 | Requirements communicated to the supplier | `reqs` field + signed T&Cs document + Communications log |
| ISO 14001 8.1 | Environmental requirements to suppliers | `reqs` + `stds` includes ISO 14001 |
| ISO 45001 8.1.4.2 | Contractor competence, RAMS, H&S performance | Category "Contractor on site" requires RAMS + SSIP/competence; H&S criterion |
| ISO 27001 A.5.19–5.22 | Supplier security agreements and monitoring | Category "IT / data processor" requires DPA + CE/27001 |
| All | Expiries monitored and pursued | Documents & expiry; Communications log; audit trail |

The Overview's "Audit readiness" panel evaluates these live (function `R` in `render()`).

## 2. Data model

```json
{
  "org": "Northfield Engineering Ltd",
  "settings": {
    "lead": 30, "follow": 7, "esc": 14,
    "from": "quality@…",
    "interval": {"Critical": 6, "High": 12, "Standard": 24},
    "criteria": [{"k":"quality","n":"Quality of supply","w":35}, …]   // weights total 100
  },
  "suppliers": [{
    "id": "x0pipm6",
    "name": "Ashworth Steel Ltd", "cat": "Raw materials",
    "crit": "Critical",                     // Critical | High | Standard
    "status": "Approved",                   // Prospective | Approved | Conditional | Suspended | Removed
    "contact": "", "email": "",
    "stds": ["ISO 9001"],
    "scope": "", "reqs": "",                // reqs = requirements communicated (8.4.3)
    "appby": "S. Ahmed", "appon": "2025-09-15",
    "docs":  [{"id":"","type":"Insurance (PL/EL)","exp":"2026-11-28","ref":"","req":true,"chased":null}],
    "evals": [{"id":"","date":"2026-09-09","by":"S. Ahmed","scores":{"quality":4,"delivery":3,…},"note":""}],
    "comms": [{"id":"","date":"2026-11-19","type":"Notification","subject":"","by":"","outcome":""}],
    "trail": [{"t":"2026-11-19T09:00","by":"S. Ahmed","what":"Approved and added to ASL"}]
  }]
}
```

## 3. Rules (server-side in production; identical to the front end)

* **Required documents** = `REQ[crit]` ∪ `CATREQ[cat]`. A `|` in a requirement means "any of".
* **Document state**: no expiry → `missing`; past → `expired`; within `settings.lead` days → `soon`; else `ok`.
* **Score** = Σ(score × weight) / Σ weight, one decimal.
* **Status rule** (`applyRules`): an Approved/Conditional supplier is `Conditional` if any mandatory document is expired or missing, or the last score < 3.0; otherwise `Approved`. Score < 2.0 on a new evaluation → `Suspended`. Prospective → Approved automatically when the first evaluation scores ≥ 3.0 (records approver and date). Every status change is written to `trail`.
* **Next re-evaluation** = last evaluation date (or approval date) + `settings.interval[crit]` months.
* **Audit trail**: append-only; every field change, document change, evaluation, notification and status change.

## 4. One-click notification

`buildMail(supplier)` composes one email per supplier listing exactly what is expired, expiring or missing, the due date (`today + follow + 7`), a per-supplier upload link, and the recorded requirements. `notify(ids)` previews; "Send and log" writes a `comms` entry (type `Notification` or `Follow-up` if one was sent within `esc` days), stamps `chased` on each document, and writes the trail.

Production flow:

1. `POST /suppliers/notify {ids}` → server composes with the same template, sends from `settings.from` via the iMS OS mail service, creates a signed upload token per supplier (`/upload/{token}`, expires 30 days).
2. Supplier uploads without an account; the server stores the file in the document store, sets the document's `exp` from the form, logs `comms` outcome `Received`, re-runs the status rule.
3. Scheduler (daily): for each document with state `soon` or `expired` and no chase in `follow` days → send follow-up; after `esc` days with no reply → create a task for the buyer and log `Escalation`. Alice narrates these on the Overview.

## 5. Endpoints the front end expects

```
GET    /api/suppliers                      → full model (or paged)
POST   /api/suppliers                      → create (Prospective)
PATCH  /api/suppliers/{id}                 → fields; server writes trail
POST   /api/suppliers/{id}/documents       → {type, exp, ref, fileId}
PATCH  /api/suppliers/{id}/documents/{docId}
DELETE /api/suppliers/{id}/documents/{docId}
POST   /api/suppliers/{id}/evaluations     → {scores, note}; server computes score, applies rules
POST   /api/suppliers/notify               → {ids}; returns per-supplier send result
GET    /api/suppliers/auditor-pack?format=pdf|html
GET    /api/suppliers/export.csv
GET/PUT /api/suppliers/settings
POST   /api/suppliers/share                → read-only auditor link {expires}
```

## 6. Hooking into the rest of iMS OS

* Documents → the iMS OS document store (file upload replaces the "Reference / note" field).
* Evaluations with score < 3 → raise an improvement/NCR in the Risks & incidents module.
* Required-document failures for contractors → block permit-to-work / site induction.
* Auditor pack → appears in the remote auditor's read-only view alongside the SoA.
* Alice: "Who is overdue?", "Chase everyone", "Draft the supplier questionnaire for X" map to the same functions.

## 7. Files

* `index.html` — the module (front end + rules + sample data)
* `SPECIFICATION.md` / `SPECIFICATION.pdf` — this document
