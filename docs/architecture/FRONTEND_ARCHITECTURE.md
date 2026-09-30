# Frontend Architecture

**Status:** Foundation rules  
**App root:** `ims-systems-v5-frontend/`  
**Related:** [V5_ARCHITECTURE.md](./V5_ARCHITECTURE.md), [MODULE_ARCHITECTURE.md](./MODULE_ARCHITECTURE.md), [SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md)

---

## 1. Stack (confirmed)

- Build tool: Vite
- UI library: React
- Language: TypeScript

---

## 2. Top-level source layout

```text
ims-systems-v5-frontend/
├── src/
│   ├── main.tsx             # Vite entry
│   ├── App.tsx              # Application shell composition
│   ├── providers.tsx        # QueryClient and other app providers
│   ├── modules/             # Business UI modules (empty until tasked)
│   ├── shared/              # Shared UI, hooks, utilities, API client core
│   └── security/            # Auth client abstraction + development stub
├── index.html
├── package.json
├── vite.config.ts
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
- Public env uses Vite `VITE_*` variables (for example `VITE_API_BASE_URL`).

Server state: TanStack Query (D-15).  
Client/application state: Zustand when justified (D-05) — do not use Zustand as a remote-data cache.

---

## 5. Design system / UI libraries

- UI primitives: shadcn/ui (D-04)
- Icons: Lucide (D-04)

Do not install a second UI framework or invent a custom design system.

---

## 6. Routing

- No router is required until business routes exist.
- When client routing is introduced, prefer React Router and keep route composition outside module internals.
- Do not recreate Next.js App Router conventions.

---

## 7. V4 reference map (do not copy)

| V4 location | V5 intent |
| ----------- | --------- |
| `src/views/<Feature>` | `src/modules/<slug>/` |
| `src/services/*Service.js` | module `api/` + `shared` HTTP core |
| `src/rolesAndPermissions.js`, CASL UI | security abstraction / OpenFGA-backed checks later |
| `src/components`, `hooks`, `utils` | selectively re-home under `shared/` when needed |

---

## 8. Related deferred decisions

| ID | Topic |
| -- | ----- |
| D-07 | Carbo Calc / `cc-frontend-master` relationship to V5 frontend |
| D-16 | Auth0 client integration approach (senior-owned; previously Next.js-oriented) |
