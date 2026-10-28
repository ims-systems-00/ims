# V5 email template catalog

Code-owned TypeScript templates under `infrastructure/email/templates`. Modules call `renderEmail(id, data, { branding? })` and pass the result to `EmailSystem`. There is no admin CMS for email **content**.

**Branding:** every template shares one premium header + footer. Default brand is iMS Systems (blue monogram). Organisations set logo + hex/presets under **My organisation → Customise email** (`PUT /organisations/current/logo` + `PUT /organisations/current/email-branding`). Those saved preferences are the source of truth for org-scoped mail. At send time, logo URLs are freshly signed from `logoStorage` when available.

Preview locally:

```bash
pnpm email:preview <templateId>
pnpm email:preview invitation --out /tmp/invite.html
```

| Template id | Module / send site | V4 source (intent) |
|-------------|--------------------|--------------------|
| `bug-report-support` | `report-bug` | `bugReports/bugReportForwardToiMS.ejs` |
| `bug-report-confirmation` | `report-bug` | Bug report reporter confirmation |
| `contact-demo-support` | `contact-ims` | Contact / book a demo support |
| `contact-demo-confirmation` | `contact-ims` | Contact / book a demo confirmation |
| `contact-get-started-support` | `contact-ims` | Get started enquiry support |
| `register-interest-confirmation` | `register-public-interest` | Register interest confirmation |
| `invitation` | `invitations` | Account invitation |
| `welcome` | `users` (notification adapter) | Welcome / access granted |
| `access-revoked` | `users` (notification adapter) | Access revoked |
| `email-verification` | `users` (notification adapter) | Email verification |
| `licence-request-support` | `licence-requests` | Licence request → support |
| `licence-request-received` | `licence-requests` | Licence request received |
| `licence-request-granted` | `licence-requests` | Licence request processed / granted |
| `partnership-application-received` | `partnerships` | Partnership application received |
| `partnership-code-ready` | `partnerships` | Partner code ready |
| `invoice` | `invoices` | Invoice email shell |
| `document-shared` | `document-management` | Document share |
| `document-signature-requested` | `document-management` | Ask for signature |
| `document-signed-copy` | `document-management` | Signed copy to signee |
| `audit-report` | `audits` (report adapter) | Audit extract report |
| `notification` | Shared shell for nudge-style mail | User notification shell |
| `campaign-wrap` | `email-campaign` | Campaign outer wrapper (body stays user-authored) |
| `go-live-onboard-success` | `organisation` (go-live notify) | Onboard success |
| `go-live-invoice-internal` | `organisation` (go-live notify) | Internal monthly-invoice signup alert |

## Not ported yet

- Auth0-hosted forgot / recovery / password reset (sent by Auth0, not V5).
- Account past-due / blocked / reactivated billing alerts (no V5 send sites yet).
- Licence request cancelled (no V5 send site yet).
- CQC / unused V4 EJS files whose V5 modules do not send mail yet.
