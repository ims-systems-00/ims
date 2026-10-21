# Stripe payments (billing)

**Status:** Backend + FE session redirects behind `STRIPE_ENABLED` (2026-10-19). When `STRIPE_ENABLED=false` (default), Go Live / org billing stay no-op so `development-stub` needs no Stripe secrets. Staging smoke with Stripe test mode remains.

**Related:** [organisation-onboarding.md](./organisation-onboarding.md) · [organisation.md](./organisation.md) · [license-request.md](./license-request.md) · [LICENCE_SOURCE_OF_TRUTH.md](../security/LICENCE_SOURCE_OF_TRUTH.md) · [DEV_STUB_PRODUCTION_CUTOVER.md](../security/DEV_STUB_PRODUCTION_CUTOVER.md) (LIC-01)

**V4 sources inspected:** `ims-systems-backend/src/services/payments.js`, `controllers/payments`, `startup/webhooks.js`, `services/organisation.js` (Go Live / payWithCard / billing), org routes, FE Organisation + Go Live redirect.

---

## 1. Module overview

Stripe billing lets an organisation:

1. **Start a subscription** after Go Live when paying by **Card** (Checkout Session, mode `subscription`).
2. **Pay later by card** from Organisation settings if they have no `stripeSubscriptionId` yet (same Checkout path).
3. **Manage billing** (update card, invoices, cancel) via Stripe **Customer Billing Portal** once subscribed.
4. Keep IMS licence **seat quantities** on the Stripe subscription in sync when **licence requests** increase seats (subscription item quantity updates + one-off invoice items for toolkits/modules).

**Monthly invoice** Go Live does **not** create a Stripe Checkout session. V4 marks the org `paymentSystem.status = Subscribed` immediately and emails support/accounts.

Primary users: organisation **Super Admin** (or users with org billing access). Stripe itself is the payment UI; iMS only creates sessions and reacts to webhooks.

---

## 2. Domain model (organisation)

Stored on the organisation document (V5 field names today):

| Field | Meaning |
| --- | --- |
| `paymentSystem.type` | `Card` \| `Monthly invoice` \| `null` (pre–Go Live) |
| `paymentSystem.status` | `Trial` \| `Subscribed` \| `Unsubscribed` |
| `paymentSystem.stripeCustomerId` | Stripe Customer id (`cus_…`) |
| `paymentSystem.stripeSubscriptionId` | Stripe Subscription id (`sub_…`) |

V4 also had `stripePaymentMethodId` on the model; Checkout/Portal ownership of payment methods is the practical path — do not invent a parallel card store in V5.

Licence **quantities** that feed Checkout line items come from organisation licences:

- `licences.groups.allocated` → business-unit seats (BU price)
- `licences.superUser.allocated` → Super Admin seats
- `licences.users.allocated` → user seats
- `licences.complianceTools[]` length → compliance toolkit price (quantity = count) — **only while status is Trial** on “pay with card” path
- `licences.additionalModules[]` length → add-on module price — **only while Trial** on that path

Support line: V4 adds a **support** subscription item whose quantity is `ceil(seat_money * 0.25)` where seat money is derived from BU + SA + user unit prices × quantities.

---

## 3. Capabilities

### 3.1 Go Live — Card

- **Who:** Activating Super Admin on onboard Go Live.
- **Outcome:** Org becomes customer; licences allocated; `paymentSystem.type = Card`, status typically **Trial** until Stripe confirms subscription; API returns `paymentSession.url`; FE redirects browser to Stripe Checkout.
- **V4:** After customer activation, calls `payWithCard` → `getCheckoutSessionForOrg`.
- **V5:** With `STRIPE_ENABLED=true`, `createStripeGoLiveSideEffectsAdapter` returns Checkout `url`; FE already redirects if present. Otherwise no-op → `paymentSession: null`.

### 3.2 Go Live — Monthly invoice

- **Who:** Same.
- **Outcome:** No Stripe Checkout. Status set to **Subscribed**. Internal email to support/accounts (`new-customer-signup` in V4). User still gets onboard-success mail.
- **V5:** Status `Subscribed` is set in `applyGoLive`; notify side-effect remains no-op until email templates are wired.

### 3.3 Card payment session (post–Go Live)

- **V5 API:** `GET /api/v1/organisations/:id/card-payment-session` (auth + org access).
- **Rules:**
  - Caller’s org must match `:id`.
  - Org must be `isCustomer`.
  - Must **not** already have `stripeSubscriptionId` (else error: contact support).
  - Sets `paymentSystem.type = Card`.
  - Builds Checkout from **current** allocated seats; compliance/add-module line items only if status is still **Trial**.
- **FE:** Organisation Licenses → “Card payment” calls the session API and redirects to Checkout.

### 3.4 Billing portal session

- **V5 API:** `GET /api/v1/organisations/:id/billing-session`.
- **Rules:** Org must be customer and have `stripeCustomerId`.
- **Outcome:** Stripe Billing Portal URL; return URL → `{CLIENT_URL}/organisation`.
- **FE:** Organisation Licenses → “Manage billing” when `stripeSubscriptionId` is set; opens Portal.

### 3.5 Licence request → subscription upgrade

- **When:** Licence request is approved/applied and org already has `stripeSubscriptionId`.
- **V4:** `upgradeSubscriptionWithStripe(subscriptionId, licenses)`:
  - Increments quantities on existing subscription items for BU / SA / users (matched by Stripe **price id**).
  - Increases support item by the support formula on the **delta**.
  - Creates **invoice items** (not subscription quantity) for new compliance toolkits and additional modules.
- **V5:** `POST /api/v1/organisations/current/licence-request` applies Mongo allocation, then calls `upgradeSubscription` when `stripeSubscriptionId` is set and Stripe is enabled.

### 3.6 Webhooks

- **V5 route:** `POST /api/v1/webhooks/stripe` with **raw** JSON body (mounted before `express.json`).
- **Secret:** `STRIPE_WEBHOOK_SECRET` (required when `STRIPE_ENABLED=true`).
- **Handled events:**

| Event | Effect on organisation |
| --- | --- |
| `customer.subscription.updated` | Set `stripeSubscriptionId`, status → **Subscribed** (lookup by `stripeCustomerId`) |
| `customer.subscription.deleted` | Clear `stripeSubscriptionId`, status → **Unsubscribed** |
| `customer.deleted` | Clear customer + subscription ids, status → **Unsubscribed** |
| `checkout.session.completed` | Logged only (no org field update; parity with V4) |

V5 resolves org by Stripe customer/subscription id against the single Mongo app DB.

---

## 4. Checkout session construction (V4 rules)

Mode: **`subscription`**.

| Line item | Env price id | Quantity |
| --- | --- | --- |
| Business units | `STRIPE_BU_PRICE` | `licences.groups` (omit if 0) |
| Super Admin | `STRIPE_SA_PRICE` | `licences.superUser` (omit if 0) |
| Users | `STRIPE_USER_PRICE` | `licences.users` (omit if 0) |
| Compliance toolkits | `STRIPE_COMPLIANCE_PRICE` | `complianceTools.length` (omit if 0) |
| Additional modules | `STRIPE_ADD_MODULE_PRICE` | `additionalModules.length` (omit if 0) |
| Support | `STRIPE_SUPPORT_PRICE` | `ceil((BU$+SA$+User$) * 0.25)` always pushed |

- Ensure Stripe **Customer** exists (`customers.create` with org name + office email); persist `stripeCustomerId`.
- `success_url` / `cancel_url` (V4): `{CLIENT_URL}/auth/preparation-screen`.
- Checkout `metadata`: `ims_automated_go_live`, `org_id`, `org_name` (informational; subscription sync is via customer webhooks).

---

## 5. Environment variables (names only)

Configure in Stripe Dashboard (test vs live) and map into API env. **Never commit secret keys.**

| Variable | Purpose |
| --- | --- |
| `STRIPE_PRIVATE_KEY` | Server secret key (`sk_…`) |
| `STRIPE_PUBLIC_KEY` | Publishable key if FE ever uses Stripe.js (`pk_…`) — V4 Checkout redirect does not require it on FE |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `/webhook/stripe` (`whsec_…`) |
| `STRIPE_BU_PRICE` | Recurring price id — business unit seat |
| `STRIPE_SA_PRICE` | Recurring price id — Super Admin seat |
| `STRIPE_USER_PRICE` | Recurring price id — user seat |
| `STRIPE_COMPLIANCE_PRICE` | Price id — per compliance toolkit |
| `STRIPE_ADD_MODULE_PRICE` | Price id — per additional module |
| `STRIPE_SUPPORT_PRICE` | Recurring price id — support % of seat spend |
| `CLIENT_URL` / FE origin | Success, cancel, portal return URLs |

V5 should also gate with something like `STRIPE_ENABLED=true` so local auth0-openfga can run without Stripe.

---

## 6. User journeys

```text
Go Live (Card)
  → allocate licences + isCustomer
  → create Stripe Customer (if needed)
  → Checkout Session (subscription)
  → redirect browser to session.url
  → Stripe charges / creates subscription
  → webhook subscription.updated → status Subscribed + stripeSubscriptionId

Go Live (Monthly invoice)
  → allocate licences + isCustomer
  → status Subscribed (no Stripe)
  → email accounts/support

Organisation → Card payment (no subscription yet)
  → same Checkout as above (Trial still includes toolkit/module line items)

Organisation → Manage billing (has subscription)
  → Billing Portal session → return to /organisation

Licence request applied + has subscription
  → bump subscription item quantities (+ support)
  → invoice items for new toolkits/modules
```

---

## 7. Scope boundaries

### In scope for V5 Stripe work (when implemented)

- Checkout at Go Live (Card) and post–Go Live “Card payment”.
- Billing Portal “Manage billing”.
- Webhooks updating `paymentSystem` status / ids.
- Subscription quantity upgrades on licence allocation (tied to licence request / SoT writers).
- Env validation when `STRIPE_ENABLED`.
- Raw-body webhook route mounted **before** JSON body parser.

### Out of scope / deferred

- Full pricing catalogue UI inside iMS (prices live in Stripe).
- Partner-led billing for referred orgs.
- Refunds, proration policy product rules (use Stripe defaults unless product dictates).
- Replacing Monthly invoice with Stripe Invoicing API (V4 does not).
- Document signatures (unrelated; F-02).

### Explicit V4 quirks to improve in V5

- `checkout.session.completed` does not set Subscribed — relies on `customer.subscription.updated`.
- Webhook `PaymentService` connection handling.
- Upgrade path assumes subscription items for BU/SA/user/support **exist** and match configured price ids (fragile if Checkout omitted a zero-quantity line).
- Support % hard-coded `0.25`.

---

## 8. V5 integration map

| Touchpoint | V5 status |
| --- | --- |
| Go Live Card | `createStripeGoLiveSideEffectsAdapter` when `STRIPE_ENABLED` |
| Go Live invoice notify | Status Subscribed + support email via `createGoLiveNotifySideEffectsAdapter` when email enabled |
| Card payment / billing portal | `GET …/card-payment-session`, `GET …/billing-session` |
| Licence request Stripe | After Mongo apply, `upgradeSubscription` if subscribed |
| Webhook | `POST /api/v1/webhooks/stripe` (raw body) |
| Cutover LIC-01 | Backend + FE redirects done; staging smoke remains |

**Licence SoT remains** `organisation.licences.*` ([LICENCE_SOURCE_OF_TRUTH.md](../security/LICENCE_SOURCE_OF_TRUTH.md)). Stripe is the **billing** system of record for money; Mongo remains the **entitlement** system of record for seats/toolkits.

---

## 9. Acceptance criteria

1. Card Go Live returns a Checkout URL when Stripe enabled; webhook sets `Subscribed` + ids.
2. Invoice Go Live never calls Stripe; status `Subscribed`.
3. Organisation “Card payment” works only when customer and no subscription; “Manage billing” opens Portal when customer id exists.
4. Licence seat increase with an active subscription updates Stripe quantities (or fails loudly).
5. Webhook signature failures return 400; unknown events do not 500.
6. `development-stub` / `STRIPE_ENABLED=false` keeps no-op behaviour; no secrets required locally.

---

## 10. Remaining (staging / later)

1. Staging smoke with Stripe test mode + CLI webhook forward (`stripe listen --forward-to …/api/v1/webhooks/stripe`).
2. Auth0 Organization creation at Go Live (N-09 leftover; compliance toolkit auto-provision at Go Live shipped 2026-10-21).
3. iMS admin approve/cancel surface for licence requests — records, `LR-` references, emails, and org-side history shipped 2026-10-21 (see [license-request.md](./license-request.md)).

---

*Specification derived from V4 payment/organisation code. Backend implementation lives under `ims-systems-v5-backend/src/modules/payments` and organisation billing routes.*
