# iMS OS set-up guide — in-app experience

One HTML file (`index.html`) with the complete pattern, plus `setup-steps.json` holding the nine steps and their guide text so your app can drive the same UI from data.

## The nine steps
1. Set up your organisation — business units or whole businesses, feeding the dashboard
2. Bring your compliance in — purpose, owner, review date, authorisation
3. Link documents to the standards — Compliance Settings, evidence on the clause, link follows every version
4. Statement of Applicability — built from your toolkits; select, status, evidence, score moves
5. Risk, analysed by Alice — impacts, mitigations, controls
6. Internal audits that run themselves — interval, compliance body, Alice's audit plan
7. Management review on autopilot — series, attendees, agenda, minutes, actions
8. Remote audit ready — the lead auditor logs in, read-only, live evidence, no exports
9. Alice manages it proactively — policies due, controls without evidence, audits coming up; she finds, drafts and chases, you decide

## What is in index.html
- `#proto-bar` — the prototype's mode switcher at the top. Delete this element in the product.
- Welcome modal (`#m-welcome`) — first sign-in only: Start step 1 / Let Alice start / I'll do it later.
- Set-up card (`#setupcard`) — the dashboard checklist: progress ring, next step highlighted, time estimates, Ask Alice / Continue per step, "Hide for now" (moves to the sidebar entry `Get set up n/9`).
- Guide panel (`.guide`) — the step panel in Alice's voice with sub-steps; `#g-next`, `#g-skip`, `#g-alice`.
- Spotlight (`.spot`) — a positioned box with a box-shadow mask; `spot(element, label, labelAbove)` points it at any element.
- Alice modal (`#m-alice`) — example of "Alice does the step" (create business units from a pasted list, preview, confirm).
- Completion modal (`#m-done`) — hand-over card: what is now scheduled, "Ask Alice what needs attention".
- Mock module screens (`#v-org`, `#v-docs`, `#v-other`) — replace with your real routes.

## Wiring it into the product
1. Steps and copy: load `setup-steps.json` (or keep the `STEPS` / `GUIDE` constants). Each step: `id, t (title), s (one-line why), est, alice (can Alice do it), done`.
2. Completion: mark a step done from real events, not from the Next button — e.g. first functional unit created → `org`; first repository with a document → `docs`; first document with Compliance Settings → `link`; first control set Selected → `soa`; first risk analysed → `risk`; first audit scheduled → `audit`; first review scheduled → `review`; first External Auditor invited → `remote`; first Alice question → `alice`. Call `finish(id)`.
3. Sub-steps: `renderSubs()` ties the spotlight to UI events (button click, select change, input). Map each sub-step to the real element and event in each module.
4. Persistence: the prototype saves to `localStorage['ims-setup']` and emits `window` event `ims-setup-change` with `[{id,done}]`. Replace with a per-organisation record (`setup_progress`) so it follows the user across devices and the whole team sees the same checklist.
5. Alice: `#g-alice` and the step "Ask Alice" buttons should open the Alice panel pre-filled with the step's intent (e.g. "Create these business units: …", "Upload this folder as policies", "Build my SoA from ISO 9001 and 27001"). Alice previews, the user confirms, then `finish(id)`.
6. Roles: show the card to Super Admins; show Heads of Service only the steps they can do in their unit (docs, link, soa, risk, audit, review).
7. Deep links: the customer guide chapters match the ids (`#org #docs #link #soa #risk #audit #review`), so a "Read the guide" link per step is `customer-guide/index.html#<id>`.
8. Design tokens are CSS variables at the top of the file; the layout is plain CSS grid, no framework.
