# ADR 0004: shadcn/ui and Lucide icons

- **ID:** D-04
- **Status:** Accepted

## Context

V5 frontend needs a baseline UI component approach and icon set. Earlier notes mentioned other libraries; this ADR records the approved baseline.

## Decision

- Frontend UI baseline: **shadcn/ui**
- Icons baseline: **Lucide**
- A custom icon system may be introduced later without changing the UI architecture.

## Consequences

- New V5 UI work should prefer shadcn/ui patterns and Lucide icons.
- Ant Design / MUI icon defaults are not the V5 baseline.
- Introducing a custom icon system later does not require revisiting the shadcn/ui choice unless a new ADR says so.
