# Frontend Architecture

**Status:** Foundation rules  
**App root:** `ims-systems-v5-frontend/`  
**Related:** [V5_ARCHITECTURE.md](./V5_ARCHITECTURE.md), [MODULE_ARCHITECTURE.md](./MODULE_ARCHITECTURE.md), [SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md)

---

## 1. Stack (confirmed)

- Framework: Next.js
- Language: TypeScript

---

## 2. Top-level source layout

```text
ims-systems-v5-frontend/
├── src/
│   ├── app/                 # Next.js App Router entry (placeholders only for now)
│   ├── modules/             # Business UI modules (empty until tasked)
│   ├── shared/              # Shared UI, hooks, utilities, API client core
│   └── security/            # Auth client abstraction + development stub
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. UI composition rules

- Feature UI lives under `src/modules/<module-slug>/`.
- Cross-cutting primitives live under `src/shared/`.
- Do not implement business modules until tasked.
- Prefer clear module boundaries over a single global `components/` dump (V4 pattern is a reference, not a target).

---

## 4. Data access

- Module-specific API calls live in that module’s `api/` (or equivalent).
- Shared HTTP concerns (base URL, auth header/cookie attachment, error normalization) live in `shared/` and must use the **security abstraction** for credentials.

**Pending (D-05):** Client state library (team preference noted: Zustand).  
**Pending (D-15):** Server-state library (V4 already uses TanStack Query — confirm for V5).

---

## 5. Design system / UI libraries

Not confirmed for V5 in architecture docs.

**Pending (D-04):** UI component library (team preference noted: Ant Design) and icon library (team preference noted: MUI icons).

Until approved, do not install a large UI kit solely for scaffolding.

---

## 6. Routing

- Use Next.js App Router conventions under `src/app/` when the app is bootstrapped beyond placeholders.
- Module route segments should remain traceable to module slugs where practical.

---

## 7. V4 reference map (do not copy)

| V4 location | V5 intent |
| ----------- | --------- |
| `src/views/<Feature>` | `src/modules/<slug>/` |
| `src/services/*Service.js` | module `api/` + `shared` HTTP core |
| `src/rolesAndPermissions.js`, CASL UI | security abstraction / OpenFGA-backed checks later |
| `src/components`, `hooks`, `utils` | selectively re-home under `shared/` when needed |

---

## 8. Pending decisions

| ID | Topic |
| -- | ----- |
| D-04 | UI kit and icons |
| D-05 | Zustand (or other) for client state |
| D-07 | Carbo Calc / `cc-frontend-master` relationship to V5 frontend |
| D-10 | Frontend test stack |
| D-15 | TanStack Query (or other) for server state |
| D-16 | Auth0 Next.js SDK integration approach (senior-owned) |
