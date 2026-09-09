# IMS Systems V5 Frontend

Next.js + TypeScript application for the V5 rebuild.

## Status

Scaffold only. No business modules yet.

## Rules

- Do not modify V4 (`ims-systems-frontend`, `cc-frontend-master`) for V5 work.
- Follow `docs/architecture/FRONTEND_ARCHITECTURE.md` and `docs/architecture/SECURITY_ARCHITECTURE.md`.
- Auth0 and OpenFGA are integrated later; use `src/security` ports and the development stub until then.

## Layout

```text
src/
  app/         # Next.js App Router placeholders
  modules/     # Business UI modules (empty until tasked)
  shared/      # Shared UI, hooks, HTTP helpers
  security/    # Auth client ports + development stub
```

## Scripts

Dependency installation (including `next`) and UI kit choices are pending team approval (D-01, D-04, D-23). This scaffold intentionally does not install frameworks yet.
