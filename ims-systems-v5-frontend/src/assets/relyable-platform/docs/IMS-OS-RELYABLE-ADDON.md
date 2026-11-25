# iMS OS × Relyable: add-on specification for the live system

Version 1.0 · 24 November 2026 · iMS Tech Global. Scope: what to add to the live iMS OS so that every module shows its Relyable contribution, the dashboard shows the rating by module, and Document Management can mark an upload as evidence. Nothing existing changes; everything below is additive. The mock `public/ims-os-addon.html` in `relyable-platform.zip` shows each piece running against the platform API.

## 1. What the user sees

| Where | What is added | Source |
|---|---|---|
| Sidebar (every page) | Badge: rating · band · tier, "capped" when a cap applies | `GET /v1/ratings/{org}/modules` (cached 60 s, refreshed on `score.changed` webhook) |
| Home dashboard | "Relyable rating by module" card: module, points now, points available, share of rating, biggest gap | same call |
| Top of every module page | Widget: rating + "This module contributes N of M points (S% of your rating)" + "+X available ▸ what would raise it" (top 3 gaps and the next expiries in that module) + Full report link | `GET /v1/ratings/{org}/modules?module={id}` |
| Document Management upload | Box "Use as evidence for Relyable scoring" → evidence type, issuer, issuer reference; "Also list this certification on our public Relyable report" | `POST /v1/evidence` on save |
| Document list | "evidence · type · Tier" tag per document | stored on the document record |
| Supplier record | Supplier's own Relyable rating chip | `POST /v1/registry/resolve` on create + `GET /v1/ratings/{supplierOrgId}` |

## 2. How much each module factors (the numbers)

Contribution is derived from the Standard, not set by hand: each evidence type belongs to a domain with a fixed weight (Certification 20, People 15, Safety 15, Assets 15, Governance 10, Supply chain 10, Financial 10, Information security 5), each type has a weight inside its domain, and the organisation's **scope profile** removes what does not apply, so the available points depend on the business. Examples from the engine, out of 1,000:

| Module | Engineering & lifting (Northfield) | Construction (Calder Valley) | Professional services (Thornbury) |
|---|---|---|---|
| Document Management | 399 (40%) | 346 (35%) | 499 (50%) |
| Training & Competency | 150 (15%) | 150 (15%) | 167 (17%) |
| Inventory & Assets | 150 (15%) | 150 (15%) | 167 (17%) |
| Supplier Management | 123 (12%) | 123 (12%) | 0 (not applicable) |
| Incidents & Inspections | 104 (10%) | 150 (15%) | 115 (12%) |
| Audits | 44 (4%) | 50 (5%) | 17 (2%) |
| Public record (no module) | 32 (3%) | 32 (3%) | 35 (4%) |

Caps sit on top: an expired mandatory item (for example the ISO 45001 certificate held in Document Management) caps the whole rating at 699 whatever the points, so the widget shows "capped" and names the item.

### Module → evidence types
| Module | Evidence types emitted | When |
|---|---|---|
| Document Management | `policy.hs`, `policy.review`, `policy.ack`, `fire.risk.assessment`, `cert.iso45001/9001/14001`, `cert.cyberessentials`, `cert.regulator`, `fin.insurance.el/pl`, `supplier.modern-slavery`, `infosec.dpo` | on publish, on acknowledgement (M365 read receipts), on review-date change, on certificate upload with the evidence box ticked |
| Training & Competency | `training.competence` (matrix aggregate `{ok,total}`), `training.licence`, `training.induction` | on record save, on session completion, nightly aggregate |
| Inventory & Assets | `asset.loler`, `asset.puwer`, `asset.calibration`, `fleet.olicence`, `fleet.driver.checks` | on inspection result, on QR sighting, nightly aggregate |
| Supplier Management | `supplier.approved` (critical suppliers approved `{ok,total}`), `cert.ssip` (own SSIP if held here) | on approval, on certificate update |
| Incidents & Inspections | `safety.riddor` (`{open}`), `safety.inspection`, `fire.test`, `food.hygiene` | on status change, on inspection complete, on fire test logged |
| Audits | `gov.management.review`, `infosec.mfa` (from M365) | on audit closed, nightly |

## 3. Integration contract (what the developers add)

### 3.1 Tenant setup (once)
* At onboarding, after the Relyable Identity claim (officer match or director approval, run from iMS OS), store on the tenant: `relyableOrgId`, a **connector key** (`rly_cx_…`, scoped to that organisation, created with `POST /v1/admin/keys {kind:'connector', orgId}`), and the webhook secret from `POST /v1/subscriptions {orgIds:[org], url:'https://ims-os/…/relyable-hook'}`.
* Connector keys are server-side only. The browser widget receives a short-lived token minted by iMS OS (`GET /v1/ratings/{org}/modules` accepts the connector key or a business session; mint a 15-minute session for the widget rather than exposing the key).

### 3.2 Emitting evidence (server-side, inside the existing save path)
```js
const relyable = require('relyable-sdk')({baseUrl: RLY_URL, key: tenant.relyableKey, source: 'module:documents'});
// after the document record is saved:
if (doc.relyableEvidence) await relyable.emit({
  type: doc.relyableType,                       // from the upload box
  subject: {kind:'document', id: doc.id},
  status: 'valid', observedAt: doc.issuedOn || today, validUntil: doc.expiresOn || null,
  level: 2,                                     // document; Relyable verifies with the issuer and keeps it at Tier 2
  payload: {issuer: doc.issuer, ref: doc.issuerRef, standard: label, documentId: doc.id, listPublic: doc.relyablePublic}
});
```
Rules: facts only, never the file; idempotent on (org, type, subject, observedAt, source) so retries are safe; on expiry-date edit emit again with the new `validUntil`; on document withdrawal emit `status:'expired'`. Module aggregates (training matrix, approved suppliers, LOLER register) emit one item per night with `status:'partial'` and `payload:{ok,total}` at `level:3` because the module is the system of record.

### 3.3 Document Management upload box (fields to add to the document schema)
`relyableEvidence: boolean`, `relyableType: enum (the type list above)`, `issuer: string`, `issuerRef: string`, `relyablePublic: boolean`, `relyableEvidenceId: string` (returned by the API), `relyableVerification: 'pending-issuer-verification' | 'issuer-verified' | 'issuer-rejected'` (updated by the `evidence.verified` webhook). Default the box to ticked for category Certificate, Insurance and Assessment; unticked otherwise. When a new version of a certificate is uploaded, pre-fill from the previous one.

### 3.4 Widget
Include `relyable-widget.js` once per module page with `data-org`, `data-token` and a `<div data-relyable-widget data-module="training">` where the header should appear. After any save that emitted evidence, `document.dispatchEvent(new Event('relyable:refresh'))`. The widget renders in under 50 ms from the cached call; no layout dependence on iMS OS CSS (its own class prefix `rly`).

### 3.5 Webhooks into iMS OS
`rating.changed`, `band.changed`, `cap.added`, `cap.removed`, `flag.adverse` (HMAC `Relyable-Signature: t=…,v1=…`). On receipt: invalidate the cached module call, push an ALICE notification ("Your rating moved from 712 to 699: ISO 45001 certificate expired; upload the renewal in Document Management"), and update the sidebar badge.

## 4. Build estimate
| Item | Effort |
|---|---|
| Tenant setup: claim at onboarding, key and subscription storage | 2 days |
| Evidence emitters in 6 modules + nightly aggregates | 5 days |
| Document upload box, schema fields, list tag, verification webhook | 2 days |
| Widget + sidebar badge + Home card | 2 days |
| Supplier rating chip via registry resolve | 1 day |
| Tests: each emitter changes the rating within 60 s and appears in the widget; expired certificate shows the cap; retries do not duplicate | 2 days |

## 5. Acceptance
* Saving a training record that lapses a mandatory competency changes the rating within 60 s and the Training widget shows the gap.
* Uploading an ISO certificate with the box ticked creates one evidence item (second save is a duplicate, not a second item); the Document widget's points rise; the sidebar badge updates on the webhook.
* Unticking "list on public report" removes it from the public report within a minute; ticking lists it only after issuer verification.
* A professional-services tenant sees Supplier Management as "not applicable" with 0 available points, not as a gap.
