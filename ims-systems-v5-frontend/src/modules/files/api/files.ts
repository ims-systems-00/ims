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
  contentType?: string;
  fileSize?: number;
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
      ...(input.contentType
        ? { "x-file-content-type": encodeURIComponent(input.contentType) }
        : {}),
      ...(input.fileSize !== undefined
        ? { "x-file-size": String(input.fileSize) }
        : {}),
    },
  });
}

export function createViewUrl(input: {
  bucket: string;
  key: string;
  fileName?: string;
  /**
   * "inline" (default) renders previews in the browser; "attachment"
   * must only be used for explicit downloads.
   */
  disposition?: "inline" | "attachment";
}): Promise<CreateViewUrlResult> {
  return apiRequest<CreateViewUrlResult>("/files/signed-url", {
    method: "GET",
    headers: {
      "x-file-bucket": encodeURIComponent(input.bucket),
      "x-file-key": encodeURIComponent(input.key),
      ...(input.fileName
        ? { "x-file-name": encodeURIComponent(input.fileName) }
        : {}),
      ...(input.disposition
        ? { "x-file-disposition": input.disposition }
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

function uploadWithProgress(
  url: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  if (typeof XMLHttpRequest === "undefined") {
    return fetch(url, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "application/octet-stream" },
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`File upload failed (${response.status})`);
      }
      onProgress?.(100);
    });
  }

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream"
    );
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`File upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("File upload failed (network error)"));
    xhr.send(file);
  });
}

/**
 * Upload a browser File via File Handler.
 * Memory provider URLs are skipped (no real storage PUT).
 */
export async function uploadFileViaHandler(
  file: File,
  path = "general",
  options: {
    publicBucket?: string;
    onProgress?: (percent: number) => void;
  } = {}
): Promise<FileMetaInfo> {
  const signed = await createUploadUrl({
    fileName: file.name,
    path,
    publicBucket: options.publicBucket,
    contentType: file.type || undefined,
    fileSize: file.size,
  });
  if (signed.url.startsWith("memory://")) {
    options.onProgress?.(100);
    return signed.uploadInformation;
  }
  await uploadWithProgress(signed.url, file, options.onProgress);
  return signed.uploadInformation;
}

/**
 * Download a stored file with its original filename.
 * Fetches through the signed URL so the browser saves (not navigates);
 * falls back to opening the signed URL when fetch is blocked.
 */
export async function downloadFile(meta: FileMetaInfo): Promise<void> {
  const view = await createViewUrl({
    bucket: meta.Bucket,
    key: meta.Key || meta.key,
    fileName: meta.Name,
    disposition: "attachment",
  });
  if (view.url.startsWith("memory://")) {
    throw new Error("File bytes are not available in memory storage mode");
  }
  try {
    const response = await fetch(view.url);
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      triggerAnchorDownload(objectUrl, meta.Name);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    triggerAnchorDownload(view.url, meta.Name);
  }
}

function triggerAnchorDownload(href: string, fileName: string): void {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
