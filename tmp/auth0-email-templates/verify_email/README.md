# Auth0 `verify_email` template (iMS OS)

Disposable draft aligned with V5 transactional email branding
(`#002D72` / `#0040A3` header, `#F2F5FA` page, blue CTA).

## Files

| File | Purpose |
|------|---------|
| `body.html` | Liquid HTML to paste into Auth0 Email Templates |
| `template.json` | Metadata for Management API deploy (body must be inlined) |
| `assets/iMS-OS_horizontal_white.png` | White wordmark for blue header |

## Logo

Auth0 cannot load local files. Either:

1. Host `assets/iMS-OS_horizontal_white.png` on HTTPS, then in `body.html` set:

```liquid
{% assign ims_logo_url = "https://your-cdn.example/iMS-OS_horizontal_white.png" %}
```

2. Or leave `ims_logo_url` blank — the template falls back to
   `organization.branding.logo_url`, then to a text wordmark.

## Proposed Auth0 fields (awaiting approval)

- **From:** `hello@imssystems.tech`
- **Subject:** `Verify your email - iMS OS`
- **Enabled:** `true`
- **URL lifetime:** `432000` seconds (5 days)
- **Syntax:** `liquid`
- **Template:** `verify_email`

## Deploy (only after approval)

```bash
# TOKEN must have create:email_templates (and update if template exists)
# Never print the token.

BODY=$(python3 -c 'import json,pathlib; print(json.dumps(pathlib.Path("body.html").read_text()))')
# Build JSON with body, then:
# auth0 api post "email-templates" --data @payload.json
# or PATCH email-templates/verify_email if it already exists
```

## Remove later

Delete this whole folder: `tmp/auth0-email-templates/`.
