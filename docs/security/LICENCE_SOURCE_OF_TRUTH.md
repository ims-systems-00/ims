# Licence source of truth (V5)

**Related:** [DEV_STUB_PRODUCTION_CUTOVER.md](./DEV_STUB_PRODUCTION_CUTOVER.md) (C-01, LIC-01) · [license-request.md](../module-specifications/license-request.md) (V4 product notes) · compliance toolkit catalogue in `ims-systems-v5-backend/src/modules/compliance/types/index.ts`

**Status:** Locked for C-01 (2026-10-19). Stripe / full Licence Management product remain **LIC-01**.

---

## 1. SoT statement

**Canonical entitlement for which compliance toolkits a tenant may use:**

`organisation.licences.complianceTools: string[]`

Stored on the Organisation Mongo document (`organisations` collection). This array is the **only** source Compliance may use for “licensed toolkit” decisions when `SECURITY_PROVIDER=auth0-openfga`.

Seat capacity (`licences.superUser` / `users` / `groups` allocated vs used) is a **separate** SoT for membership / FU limits — not for toolkit visibility.

---

## 2. Writers

Only these paths may change `complianceTools` (append or set):

| Writer | When | Behaviour |
| --- | --- | --- |
| **Go Live** | `POST /organisations/:id/go-live` | Sets `licences.complianceTools` from body `complianceTools` (via `applyGoLive`). |
| **Request licence** | Org `requestLicence` → `applyLicenceRequest` | `$addToSet` toolkit names onto `licences.complianceTools`. Instant apply is acceptable until LIC-01 (no pending request collection required for C-01). |
| **Seed / demo** | `development-stub` / `pnpm seed:demo` only | May pre-populate for local UI. Must not run as auth0-openfga “default entitlement”. |

No other module invents or overrides the licensed toolkit set (Compliance must not hard-code a full catalogue as licensed in auth0-openfga).

---

## 3. Readers

| Consumer | How |
| --- | --- |
| **Compliance module** | Only via `ComplianceLicencePort` (`listLicensedToolkits` / `isToolkitLicensed`). Service already gates list/provision with this port. |
| **FE licences panel** | Reads organisation profile `licences.complianceTools` for display. |
| **Navigation / toolkit sidebar** | Must eventually respect the same licensed set (product follow-up; C-01 focuses on BE Compliance port). |

Do **not** read raw org docs from deep inside Compliance repositories — keep the port boundary so Licence Management can move later without rewriting Compliance.

---

## 4. Name contract

Stored strings **must match** `COMPLIANCE_TOOLKIT_NAMES` exactly (display names, e.g. `"ISO 27001 (2022)"`, `"DSPT"`).

- Adapter **filters** unknown / typo strings; it does **not** invent licences.
- Prefer validating Go Live / request-licence body with the same catalogue (zod enum or refine) when implementing C-01.

---

## 5. Empty-set semantics

| Provider | Empty `complianceTools` |
| --- | --- |
| `auth0-openfga` | Licensed list is **empty**. No fallback to `DevAllComplianceLicencesAdapter`. |
| `development-stub` | Keep `DevAllComplianceLicencesAdapter` so local UI can explore all toolkits without Go Live toolkit picks. |

---

## 6. Licence vs provision

| Concept | Meaning |
| --- | --- |
| **Licence** | Entitlement: toolkit may appear and be provisioned / used (`assertLicensed`). |
| **Provision** | Materialisation: create control statuses / overview for a licensed toolkit (Go Live side effects, `provisionToolkit`). |

Both may run for the same toolkit. Provision must not succeed without a licence check in auth0-openfga.

---

## 7. Explicit non-goals (not required for C-01)

- **LIC-01** — Stripe checkout, paid subscription sync, license-request history / approve-cancel admin queue.
- **C-02** — Evidence-link AuthZ (`DevAllowEvidenceLinksAdapter`).
- **N-10** — Compliance IAM grant after provision.
- **OpenFGA toolkit tuples** — optional later; org array is sufficient for C-01.

---

## 8. Data flow

```text
Go Live / requestLicence
        │
        ▼
organisation.licences.complianceTools[]
        │
        ▼
ComplianceLicencePort (org adapter in auth0-openfga)
        │
        ▼
Compliance listToolkits / provisionToolkit / assertLicensed
```

---

## 9. C-01 implementation checklist (next coding prompt)

Prompt shape: *Fix DEV_STUB cutover item C-01 for auth0-openfga; keep development-stub DevAll.*

1. Add `createOrganisationComplianceLicenceAdapter` (or equivalent) that:
   - Loads org by id via organisation repository.
   - Maps `licences.complianceTools` through `isComplianceToolkitName` / catalogue filter.
   - Implements `listLicensedToolkits` + `isToolkitLicensed`.
2. Inject from `ims-systems-v5-backend/src/app/routes/v1/index.ts` into `createComplianceModule({ licences })` **only** when `SECURITY_PROVIDER=auth0-openfga`.
3. Leave default `DevAllComplianceLicencesAdapter` for `development-stub`.
4. Tests:
   - Org with one known toolkit → list returns only that name.
   - Unknown string in array → ignored.
   - Empty array → empty licensed list (auth0 path).
5. Update [DEV_STUB_PRODUCTION_CUTOVER.md](./DEV_STUB_PRODUCTION_CUTOVER.md) C-01 → `done` + Evidence.

---

## 10. LIC-01 (later)

Toolkit SoT remains `org.licences.complianceTools`. LIC-01 adds billing / request UX on top (Stripe, pending requests, remove demo “instant allocate” messaging). Do not block C-01 on LIC-01.

**Billing SoT:** [stripe-payments.md](../module-specifications/stripe-payments.md) (V4 Checkout, Portal, webhooks, licence upgrade).
