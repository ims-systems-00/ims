# IMS Systems V5 Frontend

Vite + React + TypeScript application for the V5 rebuild.

## Status

Phase 0 — platform bootstrap. No business modules yet.

## Setup

From the monorepo root:

```bash
pnpm install
cp ims-systems-v5-frontend/.env.example ims-systems-v5-frontend/.env.local
```

Start the V5 backend (port `3001`), then:

```bash
pnpm --filter ims-systems-v5-frontend dev
```

## Commands

```bash
pnpm --filter ims-systems-v5-frontend dev
pnpm --filter ims-systems-v5-frontend build
pnpm --filter ims-systems-v5-frontend preview
pnpm --filter ims-systems-v5-frontend lint
pnpm --filter ims-systems-v5-frontend typecheck
pnpm --filter ims-systems-v5-frontend test
```

## Architecture (brief)

| Area | Location |
| ---- | -------- |
| App entry | `src/main.tsx`, `src/App.tsx` |
| Business modules (future) | `src/modules/<slug>/` |
| Shared UI, HTTP, query, utils | `src/shared/` |
| AuthN/AuthZ ports + stub | `src/security/` |

- TanStack Query = server state; Zustand available for client/UI state when needed
- Modules call the shared HTTP client via module `api/` helpers (not raw `fetch` in UI)
- `VITE_API_BASE_URL` includes `/api/v1` (example: `http://127.0.0.1:3001/api/v1`)
- Development security stub only — Auth0/OpenFGA are not implemented

## Platform verification

The home UI includes a minimal health panel that calls `GET /api/v1/health` through the shared HTTP client and TanStack Query.
