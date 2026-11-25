# Relyable platform (POC, dependency-free Node ≥ 18)

    node server/server.js            # http://localhost:8790  (the Relyable website at /, developer console at /console.html, API under /v1)
    node --test test/*.test.js       # 15 tests
    CH_API_KEY=... node server/server.js   # live Companies House instead of fixtures
    RLY_DATA=./data/store.json RLY_SIGNING_SECRET=... PORT=8790

Keys in the demo: `rly_rd_demo` (reader), `rly_ad_demo` (admin/ops). Connector keys are created with `POST /v1/admin/keys {kind:'connector', orgId}` and are scoped to that organisation.

Layout: `lib/scope.js` (Standard §B2a applicability), `lib/score.js` (engine §B2–B5), `lib/ledger.js` (hash-chained evidence), `lib/registry.js`, `lib/identity.js` (claim service §C2), `lib/reports.js` (signed reports, verify, webhooks, portfolios), `lib/ingest.js` + `lib/connectors/` (Companies House live/fixtures; HSE, Gazette, IAF, SSIP, regulators as fixture adapters with the production shape), `lib/sdk.js` (evidence SDK for iMS OS modules), `server/app.js` (routes), `public/console.html` (reference client), `openapi.yaml`, `SPECIFICATION.md`.
