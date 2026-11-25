# iMS OS · Tender Autopilot

A standalone iMS OS module that answers tenders, PQQs and supplier questionnaires from an organisation's **private, approved library** — and takes a whole tender pack from upload to submission.

```
npm test            # 19 tests: rules (parsing, drafting, workflow, pricing, gate) + API end to end
npm start           # http://localhost:4790  (reference API + UI, rest adapter)
open public/index.html   # UI alone with the local adapter (sample data, drafting in the browser)
```

## What it does
* **Private library behind the login** — approved answers (with review dates), certificates (expiry tracked), policies (version, review date), **service provisions & method statements**, **case studies**, a **rate card** and **company facts** (`{{employees}}`, `{{turnover}}` … referenced from answers, so one update refreshes every draft). Everything is tenant-scoped; nothing is sent to a third party.
* **Upload the buyer's files** — Excel, Word, CSV or text pasted from a procurement portal. The parser finds the question column, sections, references, word limits, yes/no and upload questions (`rules.fromRows / fromParagraphs / fromText`), with no dependencies (`public/js/zip.js` reads and writes .xlsx/.docx directly).
* **Tender packs** — a bid workspace: add the ITT, specification, questionnaire and pricing schedule; the module classifies each document and extracts **requirements** (shall/must → mandatory, should → desirable), **evaluation weightings**, **key dates** (deadline, clarifications, contract start), **questions** and **pricing lines**.
* **ALICE drafts** — every question matched to the library with a confidence score and sources shown: approved answers (facts filled in), company facts for factual questions, certificates/policies for yes/no and upload questions, **method-statement answers composed from services, case studies and policies** for "describe / explain / case studies" questions. Negative yes/no questions (enforcement, prosecutions, breaches) are never auto-answered "Yes". Below the tenant's confidence threshold → *needs input*.
* **Review & approve** — accept, edit, redraft, ask a colleague (tracked), approve (approver role). Approved answers are **learned** back into the library with a review date; near-duplicates refresh the existing answer instead of duplicating.
* **Compliance matrix** — ALICE links evidence to each requirement and proposes comply / partial; a person confirms. Feeds the **bid / no-bid gate** (score, verdict, issues: expiring certificates cited for mandatories, mandatory gaps, unpriced lines, deadline) and the compliance statement in the bid.
* **Pricing** — the buyer's schedule becomes editable lines; rates suggested from the rate card; overheads, margin and VAT applied; totals by category; exported as a priced Excel schedule and summarised in the bid.
* **Export** — Excel back in the buyer's layout, Word response document, CSV; for packs a full **Word tender response** (executive summary, criteria, compliance statement, responses, pricing summary, appendices).
* **Submit to the buyer** — one click emails the bid document, priced schedule, questionnaire and certificate files to the submission address on the tender (approver only; blocked until approved, assessed, priced and before the deadline). `server/mailer.js` writes `.eml` to an outbox by default or POSTs to the platform mail service (`MAIL_TRANSPORT=smtp-json`). Portal submissions are marked manually.
* **Audit trail** — every import, draft, edit, approval, export and submission, per tenant and per question.

## Layout
```
public/            UI (index.html, css/, js/zip.js, js/rules.js, js/store.js, js/app.js, data/seed.json)
server/server.js   reference API, no dependencies (Node ≥ 18)   server/ai.js  drafting provider (deterministic | alice)
server/mailer.js   outbox / smtp-json                           server/make-seed.js  regenerates sample data
server/test/       node:test suites                             openapi.yaml · SPECIFICATION.md/.pdf · docs/
```
`rules.js` is UMD and runs identically in the browser (demo) and on the server (production), so the tests cover both.

## Integration into iMS OS
1. Mount `public/` under the module route; set `window.IMS_CONFIG = { adapter: 'rest', apiBase: '/api/tender', token }` (the platform gateway supplies tenant + user; replace `auth()` in `server.js`).
2. Replace the JSON store with the platform database (model shape in `SPECIFICATION.md §3`), the file store with the platform document store (`/files`), and `mailer.send()` with the notification service.
3. `AI=alice ALICE_URL=… ALICE_KEY=…` switches drafting to ALICE. The prompt pack (system prompt, task prompts, I/O contract, guardrails, evaluation set and feedback loop) is in `docs/ALICE-PROMPTS.md`; the system prompt and the figure/reference verification live in `server/ai.js` — retrieval still runs first and ALICE only sees the tenant's approved content, so it cannot invent facts.
4. The browser add-in (roadmap) calls `POST /api/draft` with the question on the buyer's portal page and fills the field only when `autofill` is true (approved, in-date answer above threshold); the user confirms.
