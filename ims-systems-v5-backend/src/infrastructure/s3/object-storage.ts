import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { AppConfig } from "../../config";
import type { Logger } from "../logging/logger";
import {
  MemoryObjectStorageAdapter,
  type ObjectStoragePort,
} from "../../modules/files/ports";

export type CreateS3ClientOptions = {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export function createS3Client(options: CreateS3ClientOptions): S3Client {
  return new S3Client({
    region: options.region,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
  });
}

/**
 * AWS S3 adapter for File Handler signed URLs + delete.
 */
export function createS3ObjectStorageAdapter(options: {
  client: S3Client;
  logger: Logger;
}): ObjectStoragePort {
  const { client, logger } = options;

  return {
    async createUploadUrl(input) {
      const url = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: input.bucket,
          Key: input.key,
        }),
        { expiresIn: input.expiresInSeconds }
      );
      logger.debug(
        { bucket: input.bucket, key: input.key },
        "Created S3 upload URL"
      );
      return url;
    },

    async createViewUrl(input) {
      const url = await getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: input.bucket,
          Key: input.key,
          ...(input.downloadFileName
            ? {
                ResponseContentDisposition: `attachment; filename="${input.downloadFileName.replace(/"/g, "")}"`,
              }
            : {}),
        }),
        { expiresIn: input.expiresInSeconds }
      );
      logger.debug(
        { bucket: input.bucket, key: input.key },
        "Created S3 view URL"
      );
      return url;
    },

    async deleteObject(input) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: input.bucket,
          Key: input.key,
        })
      );
      logger.info(
        { bucket: input.bucket, key: input.key },
        "Deleted S3 object"
      );
    },
  };
}

/**
 * Build the object-storage port from app config.
 * Uses the in-memory adapter when FILES_PROVIDER=memory or FILES_ENABLED=false.
 */
export function createObjectStorageFromConfig(options: {
  config: AppConfig;
  logger: Logger;
}): ObjectStoragePort {
  const { config, logger } = options;

  if (!config.FILES_ENABLED || config.FILES_PROVIDER === "memory") {
    return new MemoryObjectStorageAdapter();
  }

  const client = createS3Client({
    region: config.AWS_REGION,
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  });

  return createS3ObjectStorageAdapter({ client, logger });
}

export type { ObjectStoragePort };
