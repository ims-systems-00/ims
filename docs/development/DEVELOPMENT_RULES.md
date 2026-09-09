# Development Rules

**Status:** Foundation rules  
**Related:** [MODULE_DEVELOPMENT_GUIDE.md](./MODULE_DEVELOPMENT_GUIDE.md), [TESTING_STRATEGY.md](./TESTING_STRATEGY.md), [AI_DEVELOPMENT_GUIDE.md](./AI_DEVELOPMENT_GUIDE.md), [V5_ARCHITECTURE.md](../architecture/V5_ARCHITECTURE.md)

---

## 1. Scope of work

- Implement only what the task requests.
- Do not modify `ims-systems-backend/`, `ims-systems-frontend/`, or `cc-frontend-master/` for V5 feature work.
- Do not implement business modules until explicitly tasked.
- Do not install large dependency sets without need and approval where listed as pending.

---

## 2. Sources of truth

1. Task instructions  
2. Relevant architecture docs  
3. Target module specification (if any)  
4. Approved ADRs in `docs/decisions/`  
5. V4 reference code for observed behaviour  

If sources conflict, escalate. Do not invent product behaviour.

---

## 3. Code quality

- Prefer small, reviewable changes.
- Keep modules bounded (see [MODULE_ARCHITECTURE.md](../architecture/MODULE_ARCHITECTURE.md)).
- No secrets in git.
- Match V5 naming conventions in [V5_ARCHITECTURE.md](../architecture/V5_ARCHITECTURE.md).
- Avoid drive-by refactors unrelated to the task.

---

## 4. TypeScript

- V5 backend and frontend are TypeScript-first.
- Avoid `any` unless justified and localized.
- Shared contracts between FE and BE should be explicit (exact sharing mechanism pending).

---

## 5. Security

Follow [SECURITY_ARCHITECTURE.md](../architecture/SECURITY_ARCHITECTURE.md).

- Use security ports; do not call Auth0/OpenFGA from random module code.
- Never enable the development stub in production configuration.

---

## 6. Documentation updates

- Update architecture/development docs only when rules change.
- Record approved decisions as ADRs under `docs/decisions/`.
- Do not put API/schema dumps into module specifications.

---

## 7. Pending process decisions

| ID | Topic |
| -- | ----- |
| D-01 | Monorepo tooling and install workflow |
| D-22 | Branching / PR model for the V5 monorepo (V4 READMEs differ) |
| D-23 | Lint/format toolchain (ESLint/Prettier versions and shared config) |
