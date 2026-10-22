# File Handler — AWS S3 Runbook

**Spec:** [file-handler.md](../module-specifications/file-handler.md)
**Code:** `ims-systems-v5-backend/src/modules/files/`, `src/infrastructure/s3/`

The File Handler never proxies file bytes: the API issues presigned URLs and
the browser uploads/downloads directly to S3. Parent modules persist the
returned `{ Name, Key, Bucket }` metadata on their own records.

## 1. Information needed from the AWS account owner

Provide these in `ims-systems-v5-backend/.env` (never commit real values):

| Item | Env var | Notes |
| --- | --- | --- |
| AWS account ID | — (for IAM policy review) | 12-digit account id |
| Region | `AWS_REGION` | Default `eu-west-2` |
| IAM access key / secret | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Least-privilege user/role, see §4 |
| Per-org bucket suffix | `AWS_BUCKET_SUFFIX` | Bucket = `${organizationId}${suffix}`, e.g. `-ims-private` |
| Shared non-prod bucket | `AWS_PRIVATE_BUCKET` | Single shared bucket outside production |
| Public (logos/avatars) bucket | `AWS_PUBLIC_BUCKET` | Still private; served via signed URLs |
| Browser origins | `FILES_CORS_ORIGINS` | Comma-separated, e.g. `http://localhost:3000,http://localhost:7864,https://app.example.com` |

Also confirm: whether per-org buckets already exist for test organisations,
and that local development keeps `FILES_PROVIDER=local` (only staging /
production use `s3`).

## 2. Environment matrix

| Env | `FILES_ENABLED` | `FILES_PROVIDER` | Bucket resolution |
| --- | --- | --- | --- |
| Local dev | `true` | `local` | Disk under `FILES_LOCAL_ROOT` (`.local-files`) |
| Tests / CI | any | `memory` | Fake `memory://` URLs, no AWS |
| Staging | `true` | `s3` | `AWS_PRIVATE_BUCKET` (shared) |
| Production | `true` | `s3` | `${organizationId}${AWS_BUCKET_SUFFIX}` per org |

Signed URL TTLs: upload ~3h (`FILES_UPLOAD_URL_TTL_SECONDS=10800`),
view/download ~12h (`FILES_VIEW_URL_TTL_SECONDS=43200`).
Max upload size: `FILES_MAX_UPLOAD_BYTES` (default 25 MiB) — validated
server-side and bound into the signed PUT (`Content-Length`/`Content-Type`).

## 3. Bucket provisioning

Per-org buckets must exist before the first upload — the API returns
`503 FILES_BUCKET_UNAVAILABLE` otherwise (it probes with `HeadBucket`).

```bash
cd ims-systems-v5-backend
# Production per-organisation buckets
pnpm provision:files-buckets -- --organization-id org_123,org_456

# Staging shared bucket (+ public bucket when AWS_PUBLIC_BUCKET is set)
pnpm provision:files-buckets -- --shared
```

The script (`scripts/ensure-files-bucket.ts`) is idempotent and applies:
create-if-missing, public-access block (all four flags), SSE-S3 (AES256)
encryption, and CORS (`PUT/GET/DELETE/HEAD`, `AllowedHeaders: *`,
`ExposeHeaders: ETag`).

> Orphaned staged uploads: storage keys are flat UUIDs with no prefix, so
> an S3 lifecycle rule cannot distinguish staged-but-never-saved objects.
> No lifecycle rule is applied; revisit if keys gain a `staging/` prefix.

## 4. Least-privilege IAM policy (draft for review)

Runtime (API) identity — object operations only, no bucket creation:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "FileHandlerObjects",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::*-ims-private/*"
    },
    {
      "Sid": "FileHandlerBucketProbe",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::*-ims-private"
    }
  ]
}
```

Adjust the resource suffix to your `AWS_BUCKET_SUFFIX` / bucket names, and
add the public bucket ARN. The provisioning script additionally needs
`s3:CreateBucket`, `s3:PutPublicAccessBlock`, `s3:PutEncryptionConfiguration`
and `s3:PutBucketCors` — grant those only to the operator running it, not
to the runtime identity.

## 5. Security model (implemented)

- All `/files` routes require an authenticated identity with an
  organisation context.
- View/delete only accept the caller's own organisation bucket (or the
  configured public bucket); arbitrary buckets return `403`.
- Storage keys must match the issued UUID pattern; traversal/foreign keys
  return `400`.
- Parent-record authorisation stays with the parent module (spec §4).

## 6. Real-S3 smoke test

Requires §1 inputs. Real-AWS checks stay out of CI.

```bash
cd ims-systems-v5-backend   # .env: FILES_PROVIDER=s3 + credentials
pnpm provision:files-buckets -- --organization-id <your-test-org-id>
pnpm smoke:files-s3 -- --organization-id <your-test-org-id>
```

The smoke script requests an upload URL through the Files service, PUTs a
small text object directly to S3, fetches it via a view URL, deletes it,
and confirms the view URL no longer works. See
`scripts/smoke-files-s3.ts`.

**Current status:** no AWS credentials are present in the repo `.env`
(`AWS_ACCESS_KEY_ID` empty, `FILES_PROVIDER=local`), so the smoke test
cannot pass until §1 is provided.
