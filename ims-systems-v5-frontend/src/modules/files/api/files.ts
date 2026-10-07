import { apiRequest } from "@/shared/lib/http";
import type {
  CreateUploadUrlResult,
  CreateViewUrlResult,
  FileMetaInfo,
} from "../types";

/**
 * Request a signed upload URL.
 * Headers mirror V4 / V5 File Handler (`x-file-*`).
 */
export function createUploadUrl(input: {
  fileName: string;
  path?: string;
  publicBucket?: string;
}): Promise<CreateUploadUrlResult> {
  return apiRequest<CreateUploadUrlResult>("/files/signed-url/uploads", {
    method: "GET",
    headers: {
      "x-file-key": encodeURIComponent(input.fileName),
      ...(input.path
        ? { "x-file-path": encodeURIComponent(input.path) }
        : {}),
      ...(input.publicBucket
        ? { "x-file-public": encodeURIComponent(input.publicBucket) }
        : {}),
    },
  });
}

export function createViewUrl(input: {
  bucket: string;
  key: string;
  fileName?: string;
}): Promise<CreateViewUrlResult> {
  return apiRequest<CreateViewUrlResult>("/files/signed-url", {
    method: "GET",
    headers: {
      "x-file-bucket": encodeURIComponent(input.bucket),
      "x-file-key": encodeURIComponent(input.key),
      ...(input.fileName
        ? { "x-file-name": encodeURIComponent(input.fileName) }
        : {}),
    },
  });
}

export function deleteStoredFile(input: {
  key: string;
  bucket?: string;
}): Promise<{ Bucket: string; Key: string }> {
  return apiRequest<{ Bucket: string; Key: string }>("/files", {
    method: "DELETE",
    headers: {
      "x-file-key": encodeURIComponent(input.key),
      ...(input.bucket
        ? { "x-file-bucket": encodeURIComponent(input.bucket) }
        : {}),
    },
  });
}

/**
 * Upload a browser File via File Handler.
 * Memory provider URLs are skipped (no real S3 PUT).
 */
export async function uploadFileViaHandler(
  file: File,
  path = "general"
): Promise<FileMetaInfo> {
  const signed = await createUploadUrl({
    fileName: file.name,
    path,
  });
  if (!signed.url.startsWith("memory://")) {
    const response = await fetch(signed.url, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
    });
    if (!response.ok) {
      throw new Error(`File upload failed (${response.status})`);
    }
  }
  return signed.uploadInformation;
}
