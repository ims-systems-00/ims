# Backend Architecture

**Status:** Foundation rules  
**App root:** `ims-systems-v5-backend/`  
**Related:** [V5_ARCHITECTURE.md](./V5_ARCHITECTURE.md), [MODULE_ARCHITECTURE.md](./MODULE_ARCHITECTURE.md), [SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md), [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md)

---

## 1. Stack (confirmed)

- Runtime: Node.js
- Framework: Express
- Language: TypeScript
- Persistence: MongoDB

---

## 2. Top-level source layout

```text
ims-systems-v5-backend/
├── src/
│   ├── app/                 # Express app creation, middleware wiring, server entry
│   ├── config/              # Environment and typed config loading
│   ├── modules/             # Business modules (empty until tasked)
│   ├── shared/              # Cross-cutting pure helpers, errors, types
│   ├── infrastructure/      # MongoDB, HTTP clients, logging adapters
│   └── security/            # AuthN/AuthZ interfaces + development stub
├── tests/                   # Cross-cutting / integration tests
├── package.json
├── tsconfig.json
└── README.md
```

Do not place business logic in `app/`, `config/`, or `infrastructure/`.

---

## 3. Request flow

```text
HTTP → app middleware → security (authenticate/authorize) → module route
    → controller → service → repository/infrastructure → MongoDB
```

- Middleware for auth must call the **security abstraction**, not Auth0/OpenFGA SDKs directly from modules.
- Modules receive a resolved security context (user/org/permissions as defined by the abstraction).

---

## 4. Shared vs infrastructure

| Layer | Contains | Must not contain |
| ----- | -------- | ---------------- |
| `shared/` | Errors, result types, pure utilities | DB drivers, Express app, secrets I/O |
| `infrastructure/` | Mongo connection, external adapters | Business rules |
| `security/` | AuthN/AuthZ ports + stub/adapters | Module-specific policies duplicated ad hoc |

---

## 5. Configuration and secrets

- Load configuration once via `config/`.
- Never commit secrets.
- Prefer environment variables; document required keys in the backend README when added.
- Do not read `process.env` deep inside modules once config loading exists.

---

## 6. API surface

- Expose JSON HTTP APIs from module routers registered by `app/`.
- Keep route registration centralized enough that the app’s mounted modules are discoverable.

**Pending (D-03):** Final public path prefix / versioning scheme.

---

## 7. V4 reference map (do not copy)

| V4 location | V5 intent |
| ----------- | --------- |
| `src/routes`, `controllers`, `services` | `src/modules/<slug>/...` |
| `src/models/mongodb` | Module repositories + shared schema kits (when designed) |
| `src/middleware/deserializeUser`, `enforceRbac` | `src/security/` abstraction |
| `src/helpers`, `src/config` | `shared/` / `config/` / `infrastructure/` |

---

## 8. Pending decisions

| ID | Topic |
| -- | ----- |
| D-01 | Workspace / package management for the monorepo |
| D-02 | Dedicated V5 database vs shared V4 database |
| D-03 | API versioning |
| D-10 | Test runner and e2e strategy for backend |
| D-13 | Validation library choice (e.g. Zod / Joi) — approve before wide use |
| D-14 | Logging library / correlation-id standard |
