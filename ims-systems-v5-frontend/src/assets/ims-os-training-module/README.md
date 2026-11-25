# iMS OS · Training & Competency module

The people counterpart of the Inventory & Asset module, built the same way: a register (people), rules (roles → required competencies with renewal periods), scheduled items (training and acknowledgements with expiry), results with evidence, a plan, an auditor pack, and a self-service phone page per person. It is the single service other modules ask "is this person competent for X?".

## Run it

```
npm start     # http://localhost:3100 — UI, API, self-service at /t/{personId}
npm test      # 27 tests: rules + API
```

Demo tokens: `demo-manager`, `demo-viewer` (`Authorization: Bearer …`). Self-service: open `/t/p03` (the reference uses the person id as the token; production issues a signed, expiring link).

## Layout

```
public/
  index.html, css/module.css, css/training.css
  js/rules.js      ★ shared rules (roles, requirements, cells, gaps, plan, readiness, isCompetent) — browser and server
  js/store.js      LocalAdapter (localStorage + seed) | RestAdapter (API)
  js/app.js        UI: overview, matrix, people, plan, sessions, policies, roles, auditor pack, "my training"
  js/qrcode.js     QR for the self-service link
  data/seed.json   sample tenant: 23 competencies, 13 roles, 14 people, ~120 records, 1 session
server/
  server.js        reference API + static + /t/{id} + /files/{id} (Node 18+, no dependencies)
  mailer.js        pluggable mail transport (outbox .eml by default)
  make-seed.js, test/
openapi.yaml · SPECIFICATION.md/.pdf · README.md
```

## Tailoring for each organisation

* **Roles & competencies** page: add/edit/archive competencies (name, renewal period, evidence type, basis, what equipment or policy it authorises, usual provider, check questions); add/remove roles; click a cell in the requirements-by-role grid to cycle mandatory → desirable → not required. Every change is in the change log.
* **Settings** page: organisation name, what you call a site, your sites and usual providers, warning lead time, induction window, reminder days, self-service upload and verification rules, link lifetime, and the invitation email template with placeholders.
* The shipped catalogue (23 competencies, 13 roles) is a starting point; tenants can replace all of it.

## Sessions: invitations, materials and outputs

* Plan a session with date, time, duration, location or video link, trainer, provider, cost and a note; attendees are staff (pre-selected from the plan) and **external people** (name, email, company) who get a record like anyone else.
* **Materials** (slides, pre-reading, joining instructions) upload to the session; shared ones are linked in the invitation and on each attendee's "my training" page.
* **Send invitations**: one email per attendee from the tenant's template with an `.ics` calendar invite, the materials links (optionally the files attached) and the person's own training link. The reference mailer writes `.eml` files to `server/data/outbox`; set `MAIL_TRANSPORT`/replace `server/mailer.js` for SES, SendGrid or Graph. The invitation log shows who was sent what and when.
* **Accept / decline**: every invitation carries two one-click links (`/r/{session}/{person}?a=accept|decline`) and the `.ics` is a real RSVP request (ORGANIZER + ATTENDEE;RSVP=TRUE), so people can answer from the email, from their calendar, or on the response page (no login; the link is the token, signed and expiring in production). The session drawer shows accepted / tentative / declined / awaiting / not invited per attendee with their note, a one-click **re-invite** for anyone who declined, and the sessions list shows the counts. Declined people drop out of the plan's "booked" set so the gap shows again.
* **Reminders**: `node server/remind.js` once a day (cron / platform scheduler) emails session reminders at 7 and 1 days to everyone who has not declined, and expiring-competency reminders at `leadDays` and 14 days (person + manager), then expiry notices. `GET /api/reminders` previews what it would send.
* **Outputs** (attendance sheet, certificates, assessments, photos) upload after the session; completing the session writes a record per attendee with the output linked as evidence; absent attendees are noted, not credited.
* Files go through `POST /api/files` (base64, 25 MB) to `server/data/files`; production points this at the iMS OS document store.

## What it does

* **Roles & requirements** — every role lists mandatory and desirable competencies; "All staff" applies to everyone; a person can carry extras. This is the documented answer to ISO 9001 7.2 a).
* **Matrix** — people × competencies with in-date / due / expired / missing / induction-window / **not applicable** states, a legend, column highlight, a compliance bar per person, and a click popover with the record details and actions (record result, mark not applicable with a reason, open person). Exemptions are per person, logged, and excluded from gaps and readiness.
* **Records** — date, result, provider, certificate reference or document id, verified-by; certificate-type competencies refuse a record without evidence; dates cannot be in the future; a Fail does not count.
* **Plan** — everything mandatory that is missing/expired/expiring in 3/6/12 months grouped by course, with who is already booked. "Book a session" pre-selects the unbooked people; completing a session writes a record per attendee.
* **Policy acknowledgements** — read-and-understood with a short quiz, renewed yearly, done by staff from their phone.
* **"My training"** — a per-person page (QR or link, no login): outstanding items, upload a certificate (marked "to verify"), acknowledge policies, see booked sessions and the full record.
* **Readiness** — ten live checks (requirements defined, nothing missing/expired, evidence retained, inductions in window, policies acknowledged, no one on controlled equipment without competence, leavers dated, next 90 days booked, trail).
* **`GET /competent?personId=&covers=`** — the question the Inventory & Asset module asks before accepting an inspection result; permit-to-work and the Report-it flow can ask the same.

## Integrating into iMS OS

1. Serve `public/`, set `window.IMS_CONFIG = { adapter:'rest', apiBase:'/api/training', selfBase:'https://app.ims-os.com/t/', token, user }`.
2. Implement `openapi.yaml` in the platform backend by porting the handlers in `server/server.js` (role check → `rules.js` → save). Keep `rules.js` as the one source of truth.
3. Replace `auth()`: `manager` = HR/quality/H&S managers and line managers for their reports (add a `scope` if you want manager-of filtering); `self` = a signed link token or the signed-in employee; `viewer` = everyone else.
4. Persist `people`, `records`, `sessions`, `roles`, `competencies`, `settings` per tenant; `version` increments on write (client polls every 20 s and on focus).
5. Self-service links: `/t/{token}` → `index.html?me=`; production tokens should expire (90 days) and be re-issued from the person's record.
6. Hook-ups: Inventory & Assets (`TRAINING_API` → `/competent`), Documents (`fileId` on records; policy text behind "Read & confirm"), Report-it (after an incident, "was X trained?"), Suppliers (contractor operatives as `external: true`), Alice (`/gaps`, `/plan`, `/readiness`), email/SMS reminders from `/gaps` at `leadDays`.
7. Expiring reminders: a daily job over `/gaps` — person (and manager) at `leadDays`, again at 14 days, and on expiry.
