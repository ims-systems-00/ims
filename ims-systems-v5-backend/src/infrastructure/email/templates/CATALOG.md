# V5 email template catalog

Code-owned TypeScript templates under `infrastructure/email/templates`. Modules call `renderEmail(id, data, { branding? })` or `renderEmailForOrganisation(...)` and pass the result to `EmailSystem`. There is no admin CMS for email **content**.

**Branding:** every template shares one premium header + footer. Default brand is iMS Systems. Organisations set logo + hex/presets under **My organisation → Customise email** (`PUT /organisations/current/logo` + `PUT /organisations/current/email-branding`). Preview drafts with `POST /organisations/current/email-branding/preview`. At send time, logo URLs are freshly signed from `logoStorage` when available (≈14-day TTL — live deploys need a public HTTPS `FILES_LOCAL_PUBLIC_BASE_URL` or S3).

**Layout modes:** `invite` | `action` | `receipt` | `alert` | `success` | `internal` | `default` — purpose chrome on a shared brand-token design system.

Preview locally:

```bash
pnpm email:preview <templateId>
pnpm email:preview invitation --branded --out /tmp/invite.html
pnpm email:preview --gallery --out-dir tmp/email-previews
pnpm email:preview --gallery --branded --out-dir tmp/email-previews
```

| Template id | Module / send site | Notes |
|-------------|--------------------|-------|
| `bug-report-support` | `report-bug` | Internal (iMS default) |
| `bug-report-confirmation` | `report-bug` | Org branding when org context |
| `contact-demo-support` | `contact-ims` | Platform default |
| `contact-demo-confirmation` | `contact-ims` | Platform default |
| `contact-get-started-support` | `contact-ims` | Platform default |
| `register-interest-confirmation` | `register-public-interest` | Platform default |
| `invitation` | `invitations` | Org branding |
| `welcome` | `users` notification adapter | Org branding when org known |
| `access-revoked` | `users` notification adapter | Org branding when org known |
| `email-verification` | `users` notification adapter | Org branding when org known |
| `licence-request-support` | `licence-requests` | Internal (iMS default) |
| `licence-request-received` | `licence-requests` | Org branding |
| `licence-request-granted` | `licence-requests` | Org branding |
| `licence-request-cancelled` | Catalog ready | Wire when cancel send site exists |
| `partnership-application-received` | `partnerships` | Org branding |
| `partnership-code-ready` | `partnerships` | Org branding + code block |
| `invoice` | `invoices` | Org branding |
| `document-shared` | `document-management` | Org branding |
| `document-signature-requested` | `document-management` | Org branding |
| `document-signed-copy` | `document-management` | Org branding |
| `audit-report` | `audits` | Org branding |
| `notification` | Shared shell | Ready for nudge mail adapters |
| `campaign-wrap` | `email-campaign` | Org branding; body user-authored |
| `go-live-onboard-success` | `organisation` go-live | Org branding |
| `go-live-invoice-internal` | `organisation` go-live | Always iMS default |
| `account-past-due` | Catalog ready | Wire when billing lifecycle notifies |
| `account-blocked` | Catalog ready | Wire when billing lifecycle notifies |
| `account-reactivated` | Catalog ready | Wire when billing lifecycle notifies |
| `txn-email-invitation` | Catalog ready | Wire when txn-email module lands in V5 |

## Not owned by V5 templates

- Auth0-hosted forgot / recovery / password reset.
- CQC / project-created / dashboard-report until those V5 modules send mail.
