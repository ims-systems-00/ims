import { randomUUID } from "node:crypto";
import type { SecurityIdentity } from "../../../security";
import {
  AppError,
  ForbiddenError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import type { ObjectStoragePort } from "../ports";
import type {
  CreateUploadUrlInput,
  CreateUploadUrlResult,
  CreateViewUrlInput,
  CreateViewUrlResult,
  DeleteFileInput,
  DeleteFileResult,
} from "../types";

export type FilesServiceConfig = {
  enabled: boolean;
  /** When provider is memory, endpoints work without real AWS (tests / local). */
  provider: "s3" | "memory";
  nodeEnv: string;
  privateBucket: string;
  /** Production: `${organizationId}${bucketSuffix}`. */
  bucketSuffix: string;
  publicBucket: string;
  uploadUrlTtlSeconds: number;
  viewUrlTtlSeconds: number;
  allowedPaths: string[];
};

export type FilesServiceDeps = {
  storage: ObjectStoragePort;
  config: FilesServiceConfig;
};

export type FilesService = {
  createUploadUrl: (
    identity: SecurityIdentity | null | undefined,
    input: CreateUploadUrlInput
  ) => Promise<CreateUploadUrlResult>;
  createViewUrl: (
    identity: SecurityIdentity | null | undefined,
    input: CreateViewUrlInput
  ) => Promise<CreateViewUrlResult>;
  deleteFile: (
    identity: SecurityIdentity | null | undefined,
    input: DeleteFileInput
  ) => Promise<DeleteFileResult>;
};

function requireIdentity(identity: SecurityIdentity | null | undefined): {
  organizationId: string;
} {
  if (!identity?.subjectId) throw new UnauthorizedError();
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return { organizationId: identity.organizationId };
}

function assertFilesAvailable(config: FilesServiceConfig): void {
  if (config.enabled) return;
  if (config.provider === "memory") return;
  throw new AppError({
    message:
      "File Handler is disabled. Set FILES_ENABLED=true and configure S3 credentials.",
    statusCode: 503,
    code: "FILES_DISABLED",
  });
}

function basename(fileName: string): string {
  const parts = fileName.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || fileName;
}

function extensionOf(fileName: string): string {
  const base = basename(fileName);
  const idx = base.lastIndexOf(".");
  if (idx <= 0 || idx === base.length - 1) return "";
  return base.slice(idx + 1);
}

function buildStorageKey(originalFileName: string): string {
  const ext = extensionOf(originalFileName);
  return ext ? `${randomUUID()}.${ext}` : randomUUID();
}

function sanitizePath(pathValue: string | undefined): string | undefined {
  if (pathValue === undefined || pathValue === null) return undefined;
  const trimmed = decodeHeader(pathValue).trim().replace(/^\/+|\/+$/g, "");
  if (!trimmed) return undefined;
  if (trimmed.includes("..") || trimmed.includes("\\")) {
    throw new ValidationAppError("Invalid file path");
  }
  return trimmed;
}

function decodeHeader(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function resolvePrivateBucket(
  config: FilesServiceConfig,
  organizationId: string
): string {
  if (config.nodeEnv === "production" && config.bucketSuffix.trim()) {
    return `${organizationId}${config.bucketSuffix}`;
  }
  if (config.privateBucket.trim()) {
    return config.privateBucket.trim();
  }
  if (config.bucketSuffix.trim()) {
    return `${organizationId}${config.bucketSuffix}`;
  }
  // Memory provider needs a logical bucket name only — no AWS config required.
  if (config.provider === "memory") {
    return `ims-v5-memory-${organizationId}`;
  }
  throw new AppError({
    message:
      "Private storage bucket is not configured (AWS_PRIVATE_BUCKET / AWS_BUCKET_SUFFIX)",
    statusCode: 503,
    code: "FILES_MISCONFIGURED",
  });
}

function resolveUploadBucket(
  config: FilesServiceConfig,
  organizationId: string,
  publicBucket?: string | boolean
): string {
  const publicName = config.publicBucket.trim();
  if (publicBucket === true && publicName) {
    return publicName;
  }
  if (typeof publicBucket === "string") {
    const decoded = decodeHeader(publicBucket).trim();
    if (publicName && (decoded === publicName || decoded === "true")) {
      return publicName;
    }
  }
  return resolvePrivateBucket(config, organizationId);
}

function assertAllowedPath(
  config: FilesServiceConfig,
  pathValue: string | undefined
): void {
  if (!pathValue) return;
  if (config.allowedPaths.length === 0) return;
  if (!config.allowedPaths.includes(pathValue)) {
    throw new ValidationAppError(
      `File path "${pathValue}" is not in ALLOWED_FILE_PATHS`
    );
  }
}

export function createFilesService(deps: FilesServiceDeps): FilesService {
  const { storage, config } = deps;

  return {
    async createUploadUrl(identity, input) {
      assertFilesAvailable(config);
      const { organizationId } = requireIdentity(identity);

      const rawName = input.fileName?.trim();
      if (!rawName) {
        throw new ValidationAppError(
          "File name is required (x-file-key header)"
        );
      }

      const originalName = basename(decodeHeader(rawName));
      if (!originalName) {
        throw new ValidationAppError("A valid file name is required");
      }

      const pathValue = sanitizePath(input.path);
      assertAllowedPath(config, pathValue);

      const bucket = resolveUploadBucket(
        config,
        organizationId,
        input.publicBucket
      );
      const key = buildStorageKey(originalName);
      const expiresInSeconds = config.uploadUrlTtlSeconds;

      const url = await storage.createUploadUrl({
        bucket,
        key,
        expiresInSeconds,
      });

      return {
        url,
        uploadInformation: {
          Name: originalName,
          Key: key,
          key,
          Bucket: bucket,
        },
        expiresInSeconds,
      };
    },

    async createViewUrl(identity, input) {
      assertFilesAvailable(config);
      requireIdentity(identity);

      const bucket = decodeHeader(input.bucket ?? "").trim();
      const key = decodeHeader(input.key ?? "").trim();
      if (!bucket || !key) {
        throw new ValidationAppError(
          "Bucket and key are required (x-file-bucket, x-file-key)"
        );
      }

      const fileName = input.fileName
        ? basename(decodeHeader(input.fileName))
        : undefined;
      const expiresInSeconds = config.viewUrlTtlSeconds;

      const url = await storage.createViewUrl({
        bucket,
        key,
        expiresInSeconds,
        downloadFileName: fileName,
      });

      return { url, expiresInSeconds };
    },

    async deleteFile(identity, input) {
      assertFilesAvailable(config);
      const { organizationId } = requireIdentity(identity);

      const key = decodeHeader(input.key ?? "").trim();
      if (!key) {
        throw new ValidationAppError(
          "File not deleted. Please attach file key."
        );
      }

      const bucket = input.bucket?.trim()
        ? decodeHeader(input.bucket).trim()
        : resolvePrivateBucket(config, organizationId);

      await storage.deleteObject({ bucket, key });
      return { Bucket: bucket, Key: key };
    },
  };
}
