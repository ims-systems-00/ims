# Auth0 `reset_email` template (iMS OS)

Change Password (Link) email — same branding as `verify_email`
(`#002D72` / `#0040A3` header, `#F2F5FA` page, blue CTA).

## Files

| File | Purpose |
|------|---------|
| `body.html` | Liquid HTML for Auth0 Email Templates |
| `template.json` | Metadata for Management API deploy (body must be inlined) |

## Logo

`https://assets.imssystems.tech/images/logo/ims-os/iMS-OS_horizontal_white.png`

## Auth0 fields

- **From:** `hello@imssystems.tech`
- **Subject:** `Reset your password - iMS OS`
- **Enabled:** `true`
- **URL lifetime:** `432000` seconds (5 days)
- **Syntax:** `liquid`
- **Template:** `reset_email`

## Variables used

`url`, `user.given_name`, `user.name`, `user.email`, `support_email`, `friendly_name`

Liquid uses plain `{{ var }}` (no `| escape`) so Auth0 Preview/Try renders values instead of showing the tag text.

## Deploy

```bash
# TOKEN must have create:email_templates / update:email_templates
# Never print the token.

# auth0 api post "email-templates" --data @payload.json
# or PATCH email-templates/reset_email if it already exists
```
