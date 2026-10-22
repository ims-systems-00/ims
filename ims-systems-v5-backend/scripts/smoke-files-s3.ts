/**
 * Real-AWS File Handler smoke test (manual — never run in CI).
 *
 * Exercises the Files service against real S3: signed PUT -> signed GET ->
 * delete -> signed GET must fail. See docs/development/FILE_HANDLER_AWS.md §6.
 *
 * Usage (from ims-systems-v5-backend, .env: FILES_PROVIDER=s3 + AWS creds):
 *   pnpm provision:files-buckets -- --organization-id <org-id>
 *   pnpm smoke:files-s3 -- --organization-id <org-id>
 */
import { config as loadDotenv } from "dotenv";
import { loadConfig } from "../src/config";
import { createObjectStorageFromConfig } from "../src/infrastructure/s3/object-storage";
import { createLogger } from "../src/infrastructure/logging/logger";
import { createFilesService } from "../src/modules/files/services/files.service";
import type { SecurityIdentity } from "../src/security";

loadDotenv();

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main(): Promise<void> {
  const config = loadConfig();
  if (config.FILES_PROVIDER !== "s3") {
    throw new Error("Set FILES_PROVIDER=s3 in .env before running the S3 smoke test");
  }
  const organizationId =
    argValue("--organization-id") ?? "smoke-test-org";
  const identity: SecurityIdentity = {
    subjectId: "smoke-test-user",
    organizationId,
  };

  const logger = createLogger({ level: "silent", name: "files-smoke" });
  const storage = createObjectStorageFromConfig({ config, logger });
  const service = createFilesService({
    storage,
    config: {
      enabled: config.FILES_ENABLED,
      provider: config.FILES_PROVIDER,
      nodeEnv: config.NODE_ENV,
      privateBucket: config.AWS_PRIVATE_BUCKET,
      bucketSuffix: config.AWS_BUCKET_SUFFIX,
      publicBucket: config.AWS_PUBLIC_BUCKET,
      uploadUrlTtlSeconds: config.FILES_UPLOAD_URL_TTL_SECONDS,
      viewUrlTtlSeconds: config.FILES_VIEW_URL_TTL_SECONDS,
      allowedPaths: config.ALLOWED_FILE_PATHS,
      maxUploadBytes: config.FILES_MAX_UPLOAD_BYTES,
    },
  });

  const body = `ims file-handler smoke ${new Date().toISOString()}`;
  const bytes = new TextEncoder().encode(body);

  console.log("1. Requesting upload URL…");
  const upload = await service.createUploadUrl(identity, {
    fileName: "smoke.txt",
    path: "general",
    contentType: "text/plain",
    fileSize: bytes.byteLength,
  });
  console.log(`   bucket=${upload.uploadInformation.Bucket} key=${upload.uploadInformation.Key}`);

  console.log("2. PUT directly to S3…");
  const put = await fetch(upload.url, {
    method: "PUT",
    body: bytes,
    headers: { "Content-Type": "text/plain" },
  });
  if (!put.ok) throw new Error(`PUT failed (${put.status}): ${await put.text()}`);
  console.log("   PUT ok");

  console.log("3. GET via view URL…");
  const view = await service.createViewUrl(identity, {
    bucket: upload.uploadInformation.Bucket,
    key: upload.uploadInformation.Key,
    fileName: "smoke.txt",
  });
  const get = await fetch(view.url);
  if (!get.ok) throw new Error(`GET failed (${get.status})`);
  const roundTripped = await get.text();
  if (roundTripped !== body) throw new Error("GET body mismatch");
  console.log("   GET ok, body round-tripped");

  console.log("4. DELETE object…");
  await service.deleteFile(identity, {
    bucket: upload.uploadInformation.Bucket,
    key: upload.uploadInformation.Key,
  });
  console.log("   DELETE ok");

  console.log("5. GET after delete must fail…");
  const viewAfter = await service.createViewUrl(identity, {
    bucket: upload.uploadInformation.Bucket,
    key: upload.uploadInformation.Key,
  });
  const getAfter = await fetch(viewAfter.url);
  if (getAfter.ok) throw new Error("GET after DELETE unexpectedly succeeded");
  console.log(`   GET after delete returned ${getAfter.status} as expected`);

  console.log("SMOKE PASS: upload -> view -> delete verified against real S3");
}

main().catch((error) => {
  console.error("SMOKE FAIL:", error);
  process.exitCode = 1;
});
