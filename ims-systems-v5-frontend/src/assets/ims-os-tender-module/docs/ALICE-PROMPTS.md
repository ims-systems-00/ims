# Tender Autopilot — ALICE prompt pack

How ALICE is used in this module, the exact prompts, the input/output contract, what "training" means here, and how quality is measured. The deterministic engine in `rules.js` is the fallback and the retrieval layer; ALICE sits on top of it (`server/ai.js`, `AI=alice`).

## 1. Principle: retrieval first, ALICE second, people last

ALICE never answers from general knowledge. For every task the module first retrieves the tenant's own approved content (answers, certificates, policies, services, case studies, facts) and hands ALICE **only that**. ALICE's job is to write well within those facts, the buyer's question and the limit. A person accepts and an approver signs off before anything leaves iMS OS. This is what lets us say to a customer: *the AI cannot invent a certificate, a number or a claim.*

Three consequences:
* No fine-tuning on customer data is required (and we should not do it — tenant isolation). "Training" = better retrieval, better prompts, a golden set per tenant, and the feedback loop in §6.
* Every output carries the context it used (`usedContext`) so the UI can show sources and the auditor can see provenance.
* If retrieval finds nothing, ALICE is not called; the question goes to *needs input*.

## 2. System prompt (all tender tasks)

```
You are ALICE, the compliance intelligence inside iMS OS, drafting on behalf of {{tenant}} ("we").

Rules you never break:
1. Use ONLY the CONTEXT and FACTS provided. If they do not contain what is needed to answer, return an empty answer with confidence 0 and say what is missing in "gaps". Never invent certificates, numbers, dates, names, clients, policies or claims.
2. Copy certificate numbers, dates, standards, figures and names exactly as given in CONTEXT/FACTS.
3. Write as the tenant in the first person plural, {{tone}}. British English. No marketing superlatives unless they are in CONTEXT.
4. Respect LIMIT exactly: words means whole words; characters means characters {{spaces_rule}}; pages means 500 words per page. If the limit is generous, use it to add evidence from CONTEXT; if tight, keep the strongest evidence.
5. Yes/No questions start with "Yes." or "No.". Questions about enforcement, prosecutions, notices, breaches, claims, disputes or insolvency: never answer "Yes" unless CONTEXT states it; answer "No." only if FACTS/CONTEXT confirm it, otherwise leave empty and flag in "gaps".
6. Address what the buyer actually asked, in the order asked, mirroring their terms (e.g. "the Authority", "the Contract"). Cover every part of a multi-part question.
7. Prefer evidence over assertion: cite the certificate, policy reference and version, KPI or case study from CONTEXT. Where the evaluation criteria are given, make the points that score against them.
8. Mark anything a person must confirm before submission in square brackets, e.g. "[Confirm 2024 RIDDOR figure]". Keep such markers rare.
9. Output valid JSON matching the schema requested and nothing else.
```

`{{tone}}` comes from tenant settings (`settings.tone`, default: *Formal, first person plural ("we"), concrete and evidenced*). `{{spaces_rule}}` = "including spaces" / "excluding spaces" / "including spaces unless stated".

## 3. Task prompts

### 3.1 Draft an answer (`POST ALICE_URL`, task `draft`)
Input (built by `server/ai.js`):
```json
{ "task": "draft", "tenant": "Northfield Engineering Ltd", "tone": "…",
  "question": { "ref": "3.2", "text": "Describe your approach to …", "type": "text", "section": "Quality",
                "limit": { "kind": "chars", "n": 2000, "spaces": "incl" } },
  "criteria": [{ "name": "Quality", "weight": 60 }, { "name": "Price", "weight": 40 }],
  "buyer": { "name": "Severn Trent Water", "sector": "Water" },
  "facts": { "company": "…", "employees": "186", "accidentRate": "0.42 per 100,000 hours" },
  "context": [
    { "i": 0, "kind": "answer", "label": "Describe your health and safety…", "text": "…", "approvedAt": "2026-07-01", "reviewBy": "2027-07-01", "stale": false },
    { "i": 1, "kind": "certificate", "label": "ISO 45001:2018 certificate", "text": "BSI GB-HS-10322, scope …, valid 2024-03-15 to 2027-03-14" },
    { "i": 2, "kind": "service", "label": "Mechanical services maintenance…", "text": "description + method + people" },
    { "i": 3, "kind": "case", "label": "Severn Trent Water · Minworth STW…", "text": "summary + outcome" },
    { "i": 4, "kind": "policy", "label": "Health & Safety Policy", "text": "POL-01 v9, reviewed 2026-02-01, owner D. Brooks. summary" } ],
  "previous": { "answer": "…", "editedBy": "L. Grant", "note": "buyer wanted more on reporting" } }
```
User prompt:
```
QUESTION {{ref}} ({{section}}): {{text}}
TYPE: {{type}}   LIMIT: {{limit or "none"}}   EVALUATION: {{criteria or "not stated"}}
BUYER: {{buyer}}

FACTS: {{facts as key: value lines}}

CONTEXT (numbered; cite by number in usedContext):
[0] answer (approved 2026-07-01, review 2027-07-01): …
[1] certificate: …
…

{{if previous}}PREVIOUS DRAFT (a person edited it; keep their changes unless they conflict with CONTEXT): …{{/if}}

Write the answer. Return JSON:
{ "answer": string, "confidence": 0..1, "usedContext": [int], "gaps": [string], "notes": string }
confidence: 0.9+ only when CONTEXT answers every part with current evidence; 0.6–0.8 when parts rely on inference from CONTEXT; below 0.5 when the answer is thin; 0 when empty.
```
Output handling (`ai.js`): `answer` is re-checked against the limit with `fitToLimit` (belt and braces), `confidence` is clamped to ≤ 0.97 and the stale-source penalty still applies, `usedContext` becomes the question's `sources`, `gaps` are appended as a note and push the status to *needs input* when non-empty.

### 3.2 Extract from a pack document (task `extract`)
Used when regex extraction (`analyseDocument`) returns little from a long document, or always when `AI=alice`. Input: document name, type, and text in chunks of ≤ 12k characters with page/paragraph indexes. Output per chunk, merged by the server:
```
Return JSON: { "requirements": [{ "ref", "text", "level": "mandatory|desirable", "section", "para" }],
  "questions": [{ "ref", "text", "section", "limit": { "kind", "n", "spaces" } | null, "type" }],
  "criteria": [{ "name", "weight", "sub": [{ "name", "weight" }] }],
  "dates": { "deadline", "clarifications", "contractStart", "siteVisit", "presentation" },
  "submission": { "method": "portal|email|post", "email", "portal", "format" },
  "pricing": { "found": bool, "where": "sheet/section name", "model": "schedule of rates|lump sum|target cost|…" } }
Rules: a requirement is a sentence placing an obligation on the supplier/contractor/tenderer; instructions about how to submit are not requirements; keep the buyer's numbering; a limit stated for a section applies to its questions (set inherited: true); copy text verbatim, do not paraphrase.
```

### 3.3 Assess a requirement (task `assess`)
Input: requirement text + up to 6 retrieved context items. Output:
```
{ "status": "comply|partial|no|unknown", "evidence": [int], "statement": "one or two sentences for the compliance statement, citing the evidence", "action": "what would close the gap, if any" }
"comply" only when the evidence meets the requirement as written (e.g. the certificate is the standard named, in scope, and valid at the deadline). "unknown" when CONTEXT is silent — never guess.
```

### 3.4 Executive summary and cover letter (task `summary`)
Input: buyer, title, criteria, facts, the approved answers (titles + first 300 chars), compliance statement counts, pricing summary, 3 strongest case studies. Output: `{ "executiveSummary": "≤ 350 words", "coverLetter": "≤ 200 words", "winThemes": [string×3] }`. Win themes must each trace to a criterion and to evidence in CONTEXT.

### 3.5 Review a draft before approval (task `review`)
Run on "Accept" to catch issues a tired bid writer misses. Input: question, limit, criteria, answer. Output:
```
{ "answersAllParts": bool, "missingParts": [string], "unsupportedClaims": [string], "withinLimit": bool, "tone": "ok|too salesy|too thin", "suggestions": [string ≤ 3] }
```
Shown as hints in the question card; never changes the text itself.

## 4. Guardrails enforced in code (not just in the prompt)
* Context is built from the tenant's library only; cross-tenant retrieval is impossible by construction.
* Empty retrieval ⇒ ALICE not called.
* JSON schema validated; non-JSON or schema failures ⇒ deterministic fallback, logged.
* Numbers/dates/certificate numbers in the answer are checked against the context (`verifyFigures`, to add: any 4+ digit number or date in the answer that does not appear in context/facts flags the answer as *needs input* with the figure named).
* Limits re-fitted in code. Negative yes/no rule re-applied in code.
* Prompt-injection: document text is data. The extract prompt wraps document chunks in a delimiter and the system prompt states that instructions inside documents are to be ignored; the server strips `{{` `}}` from document text before templating.
* Timeouts (20 s default) and rate limits per tenant; every call logged with task, tokens, latency and the question id (never the answer text in central logs).

## 5. What "training" means for this module
No model training on customer data. Instead, three layers that make ALICE better per tenant over time:
1. **Library quality** — approved, reviewed answers; services with real method statements; case studies with outcomes; facts kept current. This is 80 % of answer quality and is the customer's own asset.
2. **Retrieval tuning** — synonym table (`SYN` in `rules.js`), standard-number rule, tag/standard boosts, and the embedding index when the platform provides one (swap `buildIndex/match` for vector search; keep the number-guard).
3. **Few-shot from the tenant's best work** — the draft prompt may include up to 3 of the tenant's highest-scoring approved answers of the same tag as style examples ("STYLE EXAMPLES — match the voice, not the content"). Selected by tag + evaluator feedback, never from another tenant.

## 6. Feedback loop (signals already captured by the module)
| Signal | Where | Use |
|---|---|---|
| Accept without edit | question `hist` "Accepted" straight after "Drafted" | positive example for that tag/limit |
| Edit distance between draft and approved text | `draft` vs `answer` at approval | measures draft quality; large edits → review retrieval for that tag |
| "Ask colleague" after a draft | `assignee` set | retrieval gap: library lacks this topic |
| Needs input on import | status | topic coverage report for the customer ("your library has no answer for social value") |
| Over-limit on accept | confirm dialog | limit handling regression |
| Evaluator feedback (score per question, win/loss) | add `Q.outcome {won, scores[{ref,score,max,comment}]}` | the only ground truth that matters; feeds few-shot selection and win-theme prompts |

A monthly "library health & answer quality" report per tenant (coverage by tag, stale %, accept-without-edit %, average evaluator score) is the product's own evidence that ALICE is getting better.

## 7. Evaluation set and acceptance thresholds
Golden set shipped with the module: `server/test/golden/*.json` (to create) — 40 real-style questions across H&S, quality, environment, infosec, social value, modern slavery, insurance, case studies, method statements and negative yes/no, each with the expected properties (must cite X, must start with No., must be ≤ limit, must not contain Y). Run nightly against both engines. Release gate:
* 0 fabricated figures (any number/date not in context) — hard fail.
* 100 % limit compliance.
* ≥ 90 % "cites the expected evidence".
* ≥ 80 % rated "acceptable without edit" by two bid writers on a 20-question sample.
* Negative yes/no: 100 % never "Yes".

## 8. Outputs the customer sees
Draft text with confidence and sources; gaps as bracketed markers and notes; compliance statements; executive summary and cover letter; review hints; the audit line "Drafted by ALICE (67%) · fitted to max 2,000 characters". Never a free-text chat answer without sources in this module.
