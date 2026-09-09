# IMS Systems V5 Backend

Express + TypeScript + MongoDB application for the V5 rebuild.

## Status

Phase 0 — platform bootstrap. No business modules yet.

## Requirements

- Node.js >= 20
- pnpm (workspace root)
- Dedicated V5 MongoDB database (not the V4 application database)

## Setup

From the monorepo root:

```bash
pnpm install
cp ims-systems-v5-backend/.env.example ims-systems-v5-backend/.env
# Edit .env — set MONGODB_URI to a dedicated V5 database
```

## Commands

```bash
# Development (from repo root)
pnpm --filter ims-systems-v5-backend dev

# Build / start
pnpm --filter ims-systems-v5-backend build
pnpm --filter ims-systems-v5-backend start

# Tests
pnpm --filter ims-systems-v5-backend test
```

Or from this package directory:

```bash
pnpm dev
pnpm build
pnpm start
pnpm test
```

## Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/api/v1/health` | Health check (requires MongoDB connected for HTTP 200) |

## Configuration

See `.env.example`. Required:

- `MONGODB_URI` — dedicated V5 MongoDB URI
- `SECURITY_PROVIDER=development-stub` — forbidden when `NODE_ENV=production`

## Security

Authentication/authorization use ports under `src/security/`. The development stub is for local/test only and must not run in production. Auth0 and OpenFGA are not implemented here.

## Architecture

Follow `docs/architecture/BACKEND_ARCHITECTURE.md` and ADRs in `docs/decisions/`.
