import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutBucketEncryptionCommand,
  PutPublicAccessBlockCommand,
  type BucketLocationConstraint,
} from "@aws-sdk/client-s3";

/**
 * Per-organisation S3 bucket provisioning for the File Handler.
 * Pure helpers + an idempotent ensure routine so the CLI script
 * (scripts/ensure-files-bucket.ts) stays thin and logic is testable
 * with a fake command sender.
 */

export type S3CommandSender = {
  send: (command: { input: unknown }) => Promise<unknown>;
};

export function buildOrgBucketName(
  organizationId: string,
  bucketSuffix: string
): string {
  const org = organizationId.trim();
  const suffix = bucketSuffix.trim();
  if (!org) throw new Error("organizationId is required");
  if (!suffix) {
    throw new Error(
      "AWS_BUCKET_SUFFIX is required to build a per-organisation bucket name"
    );
  }
  return `${org}${suffix}`;
}

export function buildCorsConfiguration(origins: string[]) {
  const cleaned = origins.map((o) => o.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    throw new Error("At least one CORS origin is required");
  }
  return {
    CORSRules: [
      {
        AllowedMethods: ["PUT", "GET", "DELETE", "HEAD"],
        AllowedOrigins: cleaned,
        AllowedHeaders: ["*"],
        ExposeHeaders: ["ETag"],
        MaxAgeSeconds: 3000,
      },
    ],
  };
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    e.name === "NotFound" ||
    e.name === "NoSuchBucket" ||
    e.$metadata?.httpStatusCode === 404
  );
}

export async function ensureFilesBucket(
  client: S3CommandSender,
  input: {
    bucket: string;
    region: string;
    corsOrigins: string[];
  }
): Promise<{ bucket: string; created: boolean }> {
  const { bucket, region } = input;
  let created = false;

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (error) {
    if (!isNotFound(error)) throw error;
    await client.send(
      new CreateBucketCommand({
        Bucket: bucket,
        ...(region !== "us-east-1"
          ? {
              CreateBucketConfiguration: {
                LocationConstraint: region as BucketLocationConstraint,
              },
            }
          : {}),
      })
    );
    created = true;
  }

  // Private by default — files are served via signed URLs, even from the
  // logical "public" (logos/avatars) bucket.
  await client.send(
    new PutPublicAccessBlockCommand({
      Bucket: bucket,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true,
      },
    })
  );

  await client.send(
    new PutBucketEncryptionCommand({
      Bucket: bucket,
      ServerSideEncryptionConfiguration: {
        Rules: [
          {
            ApplyServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" },
            BucketKeyEnabled: true,
          },
        ],
      },
    })
  );

  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: buildCorsConfiguration(input.corsOrigins),
    })
  );

  return { bucket, created };
}
