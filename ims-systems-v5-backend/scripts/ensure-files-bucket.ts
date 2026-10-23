/**
 * Provision File Handler S3 buckets (create-if-missing, idempotent).
 *
 * Private by default: public access blocked, SSE enabled, CORS set for
 * browser presigned PUT/GET. See docs/development/FILE_HANDLER_AWS.md.
 *
 * Usage (from ims-systems-v5-backend):
 *   # Per-organisation buckets (production model: `${orgId}${AWS_BUCKET_SUFFIX}`)
 *   pnpm provision:files-buckets -- --organization-id org_123,org_456
 *
 *   # Shared non-production private bucket (AWS_PRIVATE_BUCKET) + public bucket
 *   pnpm provision:files-buckets -- --shared
 *
 * Requires FILES_ENABLED=true FILES_PROVIDER=s3 and AWS credentials in .env.
 */
import { config as loadDotenv } from "dotenv";
import { loadConfig } from "../src/config";
import { createS3Client } from "../src/infrastructure/s3/object-storage";
import {
  buildOrgBucketName,
  ensureFilesBucket,
  type S3CommandSender,
} from "../src/infrastructure/s3/bucket-provisioning";

loadDotenv();

function parseArgs(argv: string[]): {
  organizationIds: string[];
  shared: boolean;
  includePublic: boolean;
} {
  const organizationIds: string[] = [];
  let shared = false;
  let includePublic = true;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--organization-id") {
      const value = argv[i + 1] ?? "";
      organizationIds.push(
        ...value.split(",").map((v) => v.trim()).filter(Boolean)
      );
      i += 1;
    } else if (arg === "--shared") {
      shared = true;
    } else if (arg === "--no-public") {
      includePublic = false;
    }
  }
  return { organizationIds, shared, includePublic };
}

async function main(): Promise<void> {
  const config = loadConfig();
  if (config.FILES_PROVIDER !== "s3") {
    throw new Error(
      "Set FILES_PROVIDER=s3 (and FILES_ENABLED=true) before provisioning S3 buckets"
    );
  }
  if (!config.AWS_ACCESS_KEY_ID.trim() || !config.AWS_SECRET_ACCESS_KEY.trim()) {
    throw new Error("AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are required");
  }

  const { organizationIds, shared, includePublic } = parseArgs(
    process.argv.slice(2)
  );

  const targets = new Set<string>();
  for (const orgId of organizationIds) {
    targets.add(buildOrgBucketName(orgId, config.AWS_BUCKET_SUFFIX));
  }
  if (shared && config.AWS_PRIVATE_BUCKET.trim()) {
    targets.add(config.AWS_PRIVATE_BUCKET.trim());
  }
  if (includePublic && config.AWS_PUBLIC_BUCKET.trim()) {
    targets.add(config.AWS_PUBLIC_BUCKET.trim());
  }
  if (targets.size === 0) {
    throw new Error(
      "Nothing to provision: pass --organization-id <id>[,<id>] and/or --shared, and/or set AWS_PUBLIC_BUCKET"
    );
  }

  const client = createS3Client({
    region: config.AWS_REGION,
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  });

  for (const bucket of targets) {
    const result = await ensureFilesBucket(client as S3CommandSender, {
      bucket,
      region: config.AWS_REGION,
      corsOrigins: config.FILES_CORS_ORIGINS,
    });
    console.log(
      `${result.created ? "CREATED" : "EXISTS "} ${result.bucket} (region ${config.AWS_REGION}, CORS: ${config.FILES_CORS_ORIGINS.join(", ")})`
    );
  }
  console.log(`Provisioning complete: ${targets.size} bucket(s)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
