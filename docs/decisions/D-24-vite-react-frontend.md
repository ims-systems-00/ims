# ADR 0024: Vite + React + TypeScript frontend

- **ID:** D-24
- **Status:** Accepted

## Context

The V5 frontend application lives in `ims-systems-v5-frontend/`. Early V5 bootstrap work considered and briefly used **Next.js** (App Router) as the frontend framework.

The approved implementation direction was changed to a **Vite + React + TypeScript** single-page application (SPA). V5 frontend architecture is client-side React rather than Next.js server rendering or App Router conventions. Architecture documents already describe Vite + React + TypeScript as the confirmed stack; this ADR records that choice formally.

## Decision

V5 frontend uses **Vite + React + TypeScript** as the frontend application framework and build/runtime foundation.

## Decision Details

Within that foundation, the V5 frontend uses:

- **Vite** — development server and production build tooling
- **React** — UI library
- **TypeScript** — language
- **React Router** — client-side application routing when multiple routes are required ([FRONTEND_ARCHITECTURE.md](../architecture/FRONTEND_ARCHITECTURE.md))
- **TanStack Query** — server state (D-15)
- **Zustand** — client/application state only when justified (D-05)
- **shadcn/ui** and **Lucide** — UI primitives and icons (D-04)

This ADR does not redefine D-04, D-05, or D-15; it selects the application shell those decisions operate inside.

## Consequences

- The V5 frontend is a **SPA** served as a client-side React application.
- **Vite** owns local development and production build tooling (`vite.config.ts`, `index.html` entry).
- When multiple application routes are required, **browser/client routing** (React Router) is used; route composition stays outside module business logic.
- **Server-side rendering** and **Next.js-specific** features (App Router, server components, Next middleware) are not part of the current V5 frontend architecture.
- Public environment variables follow the Vite **`VITE_*`** convention (for example `VITE_API_BASE_URL`).
- Future authentication integration (including Auth0 under D-16 when revisited) must be designed for a **Vite SPA** and the existing auth client ports (D-06), not assumed Next.js middleware or server-component patterns.

## Alternatives Considered

**Next.js** was considered and briefly used during early bootstrap. It is not the selected framework for the current V5 frontend architecture because V5 targets a client-side React SPA with Vite tooling, not a Next.js server-rendered / App Router application. This is a V5 architecture selection, not a general judgement of Next.js.

## Related

- [FRONTEND_ARCHITECTURE.md](../architecture/FRONTEND_ARCHITECTURE.md)
- D-04 shadcn/ui + Lucide
- D-05 Zustand
- D-06 Auth ports / development stub
- D-15 TanStack Query
- D-16 Auth0 integration (Deferred; title still references Next.js — revisit when Auth0 work resumes)
