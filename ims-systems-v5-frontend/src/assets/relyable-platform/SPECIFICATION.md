# Relyable platform — build specification and handover

Version 1.0 · 24 November 2026 · iMS Tech Global. Companion to the *Relyable Standard v1.1*. This document describes the working proof of concept in `relyable-platform.zip` (dependency-free Node, 15 passing tests) and what production changes.

## 1. Decision recorded: two front doors, one lock

* **Relyable Identity** is the single claim service. iMS OS onboarding and relyable.com both call it; an iMS OS subscription never proves authority by itself.
* **iMS OS is the best route to a high rating**, because its modules emit evidence at Tier 3 through the evidence SDK. It is not the only route: any UK organisation can claim and submit evidence, so insurers can rely on the whole of their book.
* **Readers never receive documents, records or personal data.** Everything an impostor could change is step-up protected, logged, notified to Owners and directors, and reversible by dispute.

```
 relyable.com / iMS OS ──▶ Relyable Identity (claims, authority, passkeys, roles, audit)
 Companies House · HSE · Gazette · IAF · SSIP · regulators ──▶ ingest ──▶ evidence ledger (hash-chained, per org)
 iMS OS modules / connectors ──(SDK, rly_cx_ key)──▶ evidence ledger ──▶ score engine (Standard v1.1) ──▶ snapshots
 business session ──▶ scope · submissions · visibility · members · reports · disputes
 reader key ──▶ ratings · verify · subscriptions (HMAC webhooks) · portfolios · request verification
```

## 1a. The website runs on the API

`public/index.html` is the Relyable site (look up, report, claim, manage, portfolio, get rated, API, Standard) with no simulated data: every view is an API call. Search hits `/v1/organisations`, reports `/v1/ratings/{id}` and `/history`, the six-step claim uses Relyable Identity, Manage uses `/v1/me`, `/evidence`, `/next-risks`, `/audit`, submissions and visibility, the Portfolio page is the reader API with the demo reader key, and "Connect" creates a scoped connector key per system and pushes evidence through `/v1/evidence/batch` exactly as an iMS OS module would. `public/console.html` is the developer's bare client for the same endpoints. Demo shortcuts (codes pre-filled from the outbox, director approval, issuer confirmation) use the admin key from the page and are removed in production, where those arrive by email, SMS, post and the issuer back-office.

![Site: live report from the engine](docs/site-report2-s.png)

![Site: manage workspace](docs/site-manage-s.png)

## 2. Services (all in `lib/`)

| Service | File | Responsibilities |
|---|---|---|
| Scope & applicability | `scope.js` | 9 attribute flags; SIC → family and pre-fill; 35 evidence types with `rule(attrs)` → required / expected / optional / na; domain applicability; declaration cross-check (`checkDeclaration`) |
| Score engine | `score.js` | pure `compute({scope, items, now, facts})`: validity (binary to expiry; linear decay after half-life; `partial` scaled by ok/total), verification factor (3: 1.0, 2: .85, 1: .6, 0 register facts: .85), domain scores over applicable items, renormalised domain weights, caps (399 / 549 / 699 / 749, RIDDOR safety ≤ 40), tier = highest tier covering ≥ 50 % of applicable weight, `whatIf`, `nextRisks`, `raiseIt`; model version stamped |
| Ledger | `ledger.js` | append-only, SHA-256 hash chain per organisation, idempotent on (org, type, subject, observedAt, source), `current()` = latest per type/subject excluding disputed, `verifyChain`, `anchor` |
| Registry | `registry.js` | one record per legal entity keyed on company number; `resolve` with confidence (< 0.9 = possible, never auto-merged); module links; `publicView` |
| Identity | `identity.js` | claim steps (contact codes → authority → security), routes (imsos / officer / director / post / letter), IDV provider interface, notifications (letter to registered office on every claim, owners and directors told, 72 h block), velocity limits, 3-failure lock, one-claim-per-organisation (competing claim → dispute), passkey/TOTP only, sessions 12 h / 30 min idle, step-up (5 min) for sensitive actions, roles and their limits, officer-resignation suspension, 12-month re-attestation, hash-chained audit |
| Reports | `reports.js` | signed JWT reports (HS256 in POC; ES256 + JWKS in production), public verify (signature, expiry, withdrawal, snapshot hash), read log, subscriptions with `Relyable-Signature: t=…,v1=HMAC` deliveries, portfolios |
| Ingest & connectors | `ingest.js`, `connectors/` | Companies House live adapter (Public Data API; stream events via `/v1/admin/ch-events`) with fixture fallback; HSE, Gazette, Directors, SSIP, IAF CertSearch, Regulator adapters with the production record shape; derives cap facts; corroborates pre-filled scope (SSIP found → contractor on) |
| SDK | `sdk.js` | `emit`, `emitMany`, `resolve`, `link`, `rating`, `nextRisks`, `whatIf`, `report` for iMS OS modules |
| API | `server/app.js` | all routes in `openapi.yaml`; key kinds reader / connector (org-scoped) / admin; business session bearer; rate limiting per key; error codes |

## 3. Claim flow as implemented (the attack cases are tests)

1. `POST /v1/claims` → email and SMS codes; letter to the registered office; Owners and directors emailed; device/IP velocity and Owner-count checks (`heldForReview`); 72 h block token.
2. `POST …/verify-contact` → both codes; wrong codes count towards the 3-failure lock.
3. `GET /v1/claims/{id}` → routes with availability: `imsos` only if a verified iMS OS user with that email exists for the tenant; `director` only if the email domain is a registered domain and not a personal provider.
4. `POST …/authority`: officer → IDV result + name + DOB month/year against the Companies House officer record (fail counts towards lock); director → approval token emailed to a listed director (`POST /v1/approvals/{token}`); post → 8-character code valid 30 days (`POST …/letter-code`); letter → ops review (`POST …/review`, admin key).
5. `POST …/security` → passkey or TOTP only; if the organisation is already claimed by someone else the claim becomes a **dispute**, never a second owner; otherwise membership (role from the route), org claimed, session token.
6. Afterwards: `PUT /scope` (step-up; contradicted declarations overridden and flagged; N/A rate review), `/submissions`, `/visibility` (Owner + step-up), `/members`, `/reports`, `/disputes`. Companies House `officer.resigned` suspends the matching Owner the same day and writes to the directors if no Owner remains.

## 4. Keeping evidence current

* Connected systems push on save (SDK); duplicates are ignored; rating and webhooks fire on change.
* Manual: `POST /v1/submissions` is Tier 1 immediately ("counts now, verified later"); `POST /v1/submissions/{id}/verify` from the issuer/verifier re-emits at Tier 2 with `source: verified:<issuer>`; the old item remains on the ledger. A certificate reference already held by another organisation is rejected with 409 and audited.
* `GET /v1/ratings/{id}/next-risks` drives the 90/30/14-day reminders (not scheduled in the POC).
* Public-record items: `POST /v1/admin/ingest` nightly; adverse HSE hits require `confirmed: true` before they cap.

## 5. Production changes (from POC)

| Area | POC | Production |
|---|---|---|
| Storage | JSON store | Postgres (organisations, evidence with hash chain, snapshots, claims, members, keys, reports, subscriptions); S3 for documents with per-organisation KMS keys |
| Signing | HS256 shared secret | ES256 keys in KMS, JWKS at `/.well-known/jwks.json`, key rotation; daily anchor of each ledger head to a public timestamp |
| Identity | stub IDV; codes in outbox | GOV.UK One Login / Onfido / Yoti; SMS and email providers; WebAuthn (passkeys) with attestation; TOTP; device fingerprinting; letter printing API for registered-office post |
| Companies House | fixtures or REST on demand | REST + Streaming API consumers (companies, officers, disqualified officers, insolvency); nightly re-resolve of unlinked records |
| Registers | fixture adapters | HSE crawler + temporary-register spreadsheet; Gazette Data Service FTP ingest; IAF CertSearch API; SSIP lookups then data agreement; CQC/FSA/FCA/SIA/Traffic Commissioner feeds |
| Webhooks | queued in store | retrying deliverer with HMAC, 5 attempts over 24 h, dead-letter queue |
| Reminders / nightly | none | scheduler: ingest, decay tick (hourly), expiry reminders at 90/30/14, re-attestation, N/A-rate review queue |
| Ops | admin key | back-office UI for letter review, dispute handling, issuer verifications, competing claims; two-officer approval for document access |
| Security | in-memory rate limit | WAF, per-key quotas, audit export, ISO 27001 / CE+ / SOC 2 controls, annual pen test |

## 6. Acceptance tests (all in `test/`, all passing)

* Public lookup; Tier 0 report with scope-aware flags (SSIP N/A for professional services); overdue accounts and HSE notice cap correctly.
* Claim with wrong codes (counted), officer DOB mismatch (counted), password-only refused, letter to registered office sent, competing claim → dispute.
* Free-mail domain cannot use route B; three failures lock the claim and write to the registered office.
* Scope: step-up enforced; contractor=0 contradicted by SSIP record is overridden and flagged on the public report.
* iMS OS connector pushes 16 items through the SDK: idempotent, rating rises > 300 points to Tier 3, expired SSIP still caps at 699, HMAC-signed webhook queued, signed report verifies, tampered JWT fails, readers get no documents.
* Manual submission Tier 1 → issuer-verified Tier 2; stolen certificate reference rejected; visibility Owner-only with step-up.
* Admin cannot invite admins; last Owner cannot be removed; officer resignation suspends the Owner's session within the day.
* Portfolio scoring with possible-match handling; request verification; unauthenticated reader refused.

## 7. iMS OS integration

Inside each module's save path: `await evidence.emit({type, subject, status, observedAt, validUntil, payload, level: 3})` with the tenant's connector key. Supplier/customer modules call `resolve` on create and store the `link`. Tender Autopilot calls `report` and embeds the id. The sidebar badge and Home card read `rating`, `nextRisks` and `whatIf`. iMS OS onboarding runs Relyable Identity's officer/director route once and stores `imsTenantId` on the registry organisation, which is what makes the `imsos` claim route available.
