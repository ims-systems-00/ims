/**
 * Go Live side effect (N-09): ensure the organisation's File Handler
 * bucket exists. Mirrors the bucket-name resolution of the Files
 * service:
 *  - production + AWS_BUCKET_SUFFIX → `${organizationId}${suffix}` (per-org)
 *  - otherwise AWS_PRIVATE_BUCKET (shared), falling back to per-org name
 * Only active for FILES_ENABLED=true + FILES_PROVIDER=s3. Best-effort:
 * errors are logged, never thrown, so org create / Go Live never fail
 * because S3 provisioning hiccuped.
 */

import type { AppConfig } from "../../../config";
import type { Logger } from "../../../infrastructure/logging/logger";
import {
  ensureFilesBucket,
  type S3CommandSender,
} from "../../../infrastructure/s3/bucket-provisioning";
import { createS3Client } from "../../../infrastructure/s3/object-storage";
import type { OrganisationGoLiveSideEffectsPort } from "../ports";

export type FilesBucketProvisioningConfig = Pick<
  AppConfig,
  | "FILES_ENABLED"
  | "FILES_PROVIDER"
  | "NODE_ENV"
  | "AWS_PRIVATE_BUCKET"
  | "AWS_BUCKET_SUFFIX"
  | "AWS_REGION"
  | "AWS_ACCESS_KEY_ID"
  | "AWS_SECRET_ACCESS_KEY"
  | "FILES_CORS_ORIGINS"
>;

export function resolveProvisioningBucket(
  config: FilesBucketProvisioningConfig,
  organizationId: string
): string | null {
  if (!config.FILES_ENABLED || config.FILES_PROVIDER !== "s3") return null;
  const suffix = config.AWS_BUCKET_SUFFIX.trim();
  if (config.NODE_ENV === "production" && suffix) {
    return `${organizationId}${suffix}`;
  }
  if (config.AWS_PRIVATE_BUCKET.trim()) {
    return config.AWS_PRIVATE_BUCKET.trim();
  }
  if (suffix) return `${organizationId}${suffix}`;
  return null;
}

export function createFilesBucketSideEffectsAdapter(deps: {
  config: FilesBucketProvisioningConfig;
  logger: Logger;
  /** Test seam — defaults to the real S3 client + ensureFilesBucket. */
  ensureBucket?: (bucket: string) => Promise<{ created: boolean }>;
}): OrganisationGoLiveSideEffectsPort {
  const { config, logger } = deps;

  const ensureBucket =
    deps.ensureBucket ??
    (async (bucket: string) => {
      const client = createS3Client({
        region: config.AWS_REGION,
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      });
      return ensureFilesBucket(client as unknown as S3CommandSender, {
        bucket,
        region: config.AWS_REGION,
        corsOrigins: config.FILES_CORS_ORIGINS,
      });
    });

  return {
    async provisionComplianceToolkits() {
      return;
    },
    async createCardCheckoutSession() {
      return null;
    },
    async notifyGoLive() {
      return;
    },
    async ensureFileStorage({ organizationId }) {
      const bucket = resolveProvisioningBucket(config, organizationId);
      if (!bucket) return;
      try {
        const result = await ensureBucket(bucket);
        logger.info(
          { organizationId, bucket, created: result.created },
          result.created
            ? "Provisioned organisation file bucket"
            : "Organisation file bucket already exists"
        );
      } catch (error) {
        logger.error(
          { err: error, organizationId, bucket },
          "Failed to provision organisation file bucket (uploads may fail until provisioned)"
        );
      }
    },
  };
}
