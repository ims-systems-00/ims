# Security Architecture

**Status:** Foundation rules  
**Related:** [V5_ARCHITECTURE.md](./V5_ARCHITECTURE.md), [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md), [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md)

---

## 1. Goals

- Authenticate callers reliably.
- Authorize actions with least privilege.
- Keep Auth0 and OpenFGA **replaceable** behind stable interfaces.
- Allow local development with a **temporary stub** without leaking stub behaviour into production builds.

---

## 2. Target providers (confirmed direction)

| Concern | Target | Timing |
| ------- | ------ | ------ |
| Authentication | Auth0 | Later — senior engineers |
| Authorization | OpenFGA | Later — senior engineers |

Do **not** implement full Auth0 or OpenFGA integrations in early scaffolding unless a dedicated senior-led task requests it.

---

## 3. Abstraction requirement (confirmed)

V5 must expose isolated ports such as:

- **AuthN:** resolve current identity / session from a request (backend) or client session (frontend)
- **AuthZ:** check whether an identity may perform an action on a resource / module

Concrete TypeScript interface names may evolve; the rule is: **modules depend on ports, not on Auth0/OpenFGA SDKs**.

Suggested locations:

```text
ims-systems-v5-backend/src/security/
ims-systems-v5-frontend/src/security/
```

---

## 4. Development stub

Allowed for local/dev:

- A stub AuthN that establishes a fixed or configurable development identity
- A stub AuthZ that permits/denies via simple config or always-allow in explicit development mode

Rules:

- Stub must be impossible to enable accidentally in production configuration.
- Stub behaviour must be clearly labelled in code and docs.
- Production configuration must require real provider adapters (once implemented).

**Pending (D-06):** Exact stub contract, ownership, and env flags — senior/team-lead approval.

---

## 5. V4 reference (behavioural only)

V4 today uses:

- Custom JWT access/refresh cookies and headers
- CASL role abilities (`enforceRbac`, `@casl/ability`)
- Organisation access middleware (`authOrgAccess`)
- Separate admin authentication surface

V5 must **not** assume CASL or custom JWT remain the long-term solution. Use V4 only to understand required product behaviours (sessions, org context, admin vs user). Specs: `authentication.md`, `v3-authentication.md`, `admin-authentication.md`.

---

## 6. Baseline secure coding rules

1. Never commit secrets or `.env` files with credentials.
2. Validate and normalize external input at module boundaries.
3. Return safe error messages to clients; log details server-side.
4. Enforce authentication before authorization on protected routes.
5. Preserve tenant isolation — never trust client-supplied org id without server-side binding to the authenticated context.
6. Prefer security reviews for authz changes touching shared ports.

---

## 7. Pending decisions

| ID | Topic |
| -- | ----- |
| D-06 | Stub contract and Auth0/OpenFGA adapter ownership |
| D-08 | Separate admin authentication in V5 |
| D-16 | Auth0 Next.js integration approach |
| D-20 | Cookie vs bearer token session transport for V5 APIs |
| D-21 | OpenFGA model ownership and tuple write paths |
