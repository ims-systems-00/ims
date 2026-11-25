# iMS OS · Inventory & Asset module

Asset register with lifecycle, scheduled inspections / calibration / maintenance driven by category rules, controlled consumables, QR labels that open each asset on a phone (no login for read and basic actions), retirements and disposals with evidence, a compliance map and an auditor pack. Mapped to ISO 9001 7.1.3 / 7.1.5, ISO 14001, ISO 45001, ISO 27001 and UK regulations (LOLER, PUWER, PSSR, BS 5306, EAWR, COSHH, WEEE).

## Run it

```
npm start          # http://localhost:3000  — UI, API and the scan route, JSON file store
npm test           # 18 tests: rules + API
```

Open `http://localhost:3000`, go to *QR labels & scanning*, scan a label with a phone on the same network (set `SCAN_BASE=http://<your-ip>:3000/a/`) or open `http://localhost:3000/a/NE-0401` directly.

Demo tokens for the reference auth: `demo-manager`, `demo-staff`, `demo-competent` (send `Authorization: Bearer <token>`). Without a token the API is read-only; with `X-Scan-Name: <name>` the scan actions are allowed and attributed.

## Layout

```
public/
  index.html        module shell (markup only) + IMS_CONFIG
  css/module.css    styles (iMS OS tokens)
  js/rules.js       ★ shared compliance rules — browser AND server use this file unchanged
  js/store.js       data access: LocalAdapter (localStorage + seed) | RestAdapter (API)
  js/app.js         UI: rendering, routing, scan mode, drawers
  js/qrcode.js      QR encoder (qrcode-generator 1.4.4, MIT)
  data/seed.json    sample tenant; dates like "@-200d" are relative to today
server/
  server.js         reference API + static + /a/{tag} scan route (Node 18+, no dependencies)
  make-seed.js      regenerates data/seed.json
  test/             node:test suites for rules and API
openapi.yaml        the API contract
SPECIFICATION.md    what auditors look for → where the module answers it; data model; rules; integration
```

## Integrating into iMS OS

1. **Mount the front end** inside the iMS OS shell. Serve `public/` (or copy its four JS files and the CSS into the app bundle). In `index.html` set:
   ```js
   window.IMS_CONFIG = { adapter: 'rest', apiBase: '/api/inventory', scanBase: 'https://app.ims-os.com/a/', token: <session token>, user: { name, role } };
   ```
   The module reads the host's navigation chrome from nothing: it draws its own sidebar. To embed under the iMS OS left nav, hide `.side` with CSS and keep `main`.
2. **Implement the API** in the platform backend following `openapi.yaml`. Port `server/server.js` route handlers: each one only (a) checks role, (b) loads the asset, (c) calls a `rules.js` function, (d) saves, (e) returns the asset. Keep `rules.js` as the single source of truth; load it server-side with `require` (CommonJS) or wrap it as an ES module.
3. **Replace `auth()`** with the platform session/JWT. Role mapping: `viewer` (any signed-in user), `staff` (employees), `competent` (named competent persons and approved contractors; the Training/Competency module decides), `manager` (quality/H&S managers).
4. **Scan route** `GET /a/{tag}` → serve the module with `?asset={tag}`. Anonymous read is on by default; the `X-Scan-Name` path is for sites that want front-line reporting without logins. To restrict, require a session for the action endpoints and keep GET public.
5. **Persistence**: one row per asset and per stock item (JSON column for `checks`, `hist`, `disp` is fine), `settings` per tenant, `version` incremented on every write (the client polls `GET /model` every 20 s and on tab focus to see other devices' changes; replace with SSE/WebSocket if you already have one).
6. **Hooks into other modules**: `sup` → Suppliers; `fileId` on results → Documents; a Fail or fault → Risks & incidents (NCR); `competent` role → Training; the auditor pack and scan route → the remote-audit view; Alice reads `GET /readiness` and `issues()`.
7. **Labels**: `GET /assets/register.csv` includes the QR URL per asset; label printers (Zebra/Brother) can take that CSV, or render `public/index.html#qr` and print.

## Conventions

* Dates are `YYYY-MM-DD` and all calendar maths is UTC (`rules.js`), so due dates don't shift between server and phone timezones.
* History (`hist`) is append-only, newest first. Every mutation writes a line with who / when / what.
* Errors are `{ code, message }` with 422 for rule violations, 403 for role, 404 for missing.
* No framework, no build step. ES2019 syntax; works in current Chrome, Edge, Safari, Firefox and iOS/Android browsers.
