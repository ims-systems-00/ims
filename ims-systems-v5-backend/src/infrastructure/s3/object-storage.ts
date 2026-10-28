import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { AppConfig } from "../../config";
import type { Logger } from "../logging/logger";
import { S3WithLocalFallbackStorage } from "../../modules/files/local-fallback-storage";
import {
  createLocalObjectStorageAdapter,
  type LocalObjectStorageAdapter,
} from "../../modules/files/local-object-storage";
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

const CONTENT_TYPES_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  txt: "text/plain; charset=utf-8",
  md: "text/plain; charset=utf-8",
  log: "text/plain; charset=utf-8",
  json: "application/json",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

/**
 * MIME type inferred from the storage key extension. Stored objects are
 * not guaranteed to carry a useful Content-Type (e.g. octet-stream
 * uploads), and browsers will download PDFs/images served without one
 * even when the disposition is inline.
 */
function contentTypeForKey(key: string): string | undefined {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES_BY_EXTENSION[ext];
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
    async assertBucketExists(input) {
      await client.send(new HeadBucketCommand({ Bucket: input.bucket }));
    },

    async createUploadUrl(input) {
      const url = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: input.bucket,
          Key: input.key,
          ...(input.contentType ? { ContentType: input.contentType } : {}),
          ...(input.contentLength !== undefined
            ? { ContentLength: input.contentLength }
            : {}),
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
      const disposition = input.disposition ?? "inline";
      const fileName = input.downloadFileName?.replace(/"/g, "");
      const contentType = contentTypeForKey(input.key);
      const url = await getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: input.bucket,
          Key: input.key,
          // Inline by default: an "attachment" disposition makes the
          // browser download instead of rendering previews (PDF iframe).
          ResponseContentDisposition: fileName
            ? `${disposition}; filename="${fileName}"`
            : disposition,
          ...(contentType
            ? { ResponseContentType: contentType }
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

function localObjectEndpoint(config: AppConfig): string {
  const base = config.FILES_LOCAL_PUBLIC_BASE_URL.trim();
  if (base) {
    return `${base.replace(/\/+$/, "")}/api/v1/files/local/object`;
  }
  return `http://127.0.0.1:${config.PORT}/api/v1/files/local/object`;
}

/**
 * Build the object-storage port from app config.
 * Uses the in-memory adapter when FILES_PROVIDER=memory or FILES_ENABLED=false.
 * When provider is s3, wraps with a local-disk fallback so historical
 * `ims-v5-local-*` uploads remain previewable after switching providers.
 */
export function createObjectStorageFromConfig(options: {
  config: AppConfig;
  logger: Logger;
}): ObjectStoragePort {
  const { config, logger } = options;

  if (!config.FILES_ENABLED) {
    return new MemoryObjectStorageAdapter();
  }

  if (config.FILES_PROVIDER === "memory") {
    return new MemoryObjectStorageAdapter();
  }

  const local = createLocalObjectStorageAdapter({
    rootDir: config.FILES_LOCAL_ROOT,
    objectEndpointUrl: localObjectEndpoint(config),
    signingSecret: config.FILES_LOCAL_SIGNING_SECRET,
  });

  if (config.FILES_PROVIDER === "local") {
    logger.info(
      { rootDir: config.FILES_LOCAL_ROOT },
      "Using local disk file storage (demo / dev)"
    );
    return local;
  }

  const client = createS3Client({
    region: config.AWS_REGION,
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  });

  const s3 = createS3ObjectStorageAdapter({ client, logger });
  logger.info(
    { rootDir: config.FILES_LOCAL_ROOT },
    "Using S3 file storage with local-disk fallback for ims-v5-local-* buckets"
  );
  return new S3WithLocalFallbackStorage(s3, local);
}

export type { ObjectStoragePort, LocalObjectStorageAdapter };
export { S3WithLocalFallbackStorage, getLocalObjectStorage } from "../../modules/files/local-fallback-storage";
