# Testing Strategy

**Status:** Foundation rules  
**Related:** [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md), [MODULE_DEVELOPMENT_GUIDE.md](./MODULE_DEVELOPMENT_GUIDE.md)

---

## 1. Goals

- Protect security-sensitive paths and module business rules.
- Keep tests close to module boundaries.
- Prefer fast, deterministic unit/integration tests before broad E2E.

---

## 2. What to test (priority order)

1. **Security ports and middleware** — unauthenticated access denied; stub cannot activate in production config  
2. **Module services** — business outcomes from the specification  
3. **HTTP adapters** — validation, status codes, authz failures  
4. **Frontend module behaviour** — critical user flows once UI exists  
5. **Regression** — bugs fixed once should gain a test

---

## 3. What not to over-test early

- Snapshot-heavy UI with no behaviour
- Third-party SDK internals (Auth0/OpenFGA) — mock at the port boundary
- Entire V4 suites inside V5

---

## 4. Placement

```text
modules/<slug>/__tests__/     # module unit/integration
tests/                        # cross-cutting backend tests
```

Mirror the same idea on the frontend under each module and a small shared test setup when introduced.

---

## 5. Specification-driven cases

Derive cases from module specification sections:

- Features and Capabilities  
- User Outcomes  
- Scope Boundaries (negative cases)

Do not invent acceptance criteria that contradict the specification.

---

## 6. Pending decisions (D-10)

Approve before standardizing repo scripts:

| Area | Options to decide |
| ---- | ----------------- |
| Unit runner | Vitest / Jest / Node test runner |
| API tests | Supertest or equivalent |
| FE component tests | Testing Library + runner |
| E2E | Playwright / Cypress / none yet |
| CI gates | Required checks for V5 packages |

Until approved, new tests may be added in a minimal form, but do not mass-install frameworks across the monorepo.
