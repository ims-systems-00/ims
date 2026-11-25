import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createViewUrl,
  deleteStoredFile,
  downloadFile,
  uploadFileViaHandler,
} from "../api/files";
import type { FileMetaInfo } from "../types";

export const fileKeys = {
  all: ["files"] as const,
  view: (bucket: string, key: string) =>
    [...fileKeys.all, "view", bucket, key] as const,
};

/**
 * Signed view/download URL for a stored file.
 * Disabled when metadata is incomplete or storage is the memory fake
 * (handled by callers checking the `memory://` prefix).
 */
function safeViewFileName(
  meta: Pick<FileMetaInfo, "Key" | "key" | "Name"> | null | undefined
): string | undefined {
  const key = meta?.Key || meta?.key || "";
  const keyBase = key.split(/[\\/]/).pop() || key;
  const name = meta?.Name?.trim() || "";
  const nameExt =
    name && name.includes(".")
      ? name.slice(name.lastIndexOf(".") + 1)
      : "";
  const keyExt =
    keyBase && keyBase.includes(".")
      ? keyBase.slice(keyBase.lastIndexOf(".") + 1)
      : "";
  // Avoid sending display labels (no extension / em-dash titles) as the
  // Content-Disposition filename — that breaks PDF iframe preview.
  if (nameExt && !/ — /.test(name)) return name;
  if (keyExt) return keyBase;
  return name || undefined;
}

export function useFileViewUrlQuery(
  meta: Pick<FileMetaInfo, "Bucket" | "Key" | "key" | "Name"> | null | undefined,
  enabled = true
) {
  const bucket = meta?.Bucket ?? "";
  const key = meta?.Key || meta?.key || "";
  return useQuery({
    queryKey: fileKeys.view(bucket, key),
    queryFn: () =>
      createViewUrl({
        bucket,
        key,
        fileName: safeViewFileName(meta),
      }),
    enabled: enabled && Boolean(bucket && key),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadFileMutation() {
  return useMutation({
    mutationFn: (input: {
      file: File;
      path?: string;
      publicBucket?: string;
      onProgress?: (percent: number) => void;
    }) =>
      uploadFileViaHandler(input.file, input.path ?? "general", {
        publicBucket: input.publicBucket,
        onProgress: input.onProgress,
      }),
  });
}

export function useDeleteStoredFileMutation() {
  return useMutation({
    mutationFn: (input: { key: string; bucket?: string }) =>
      deleteStoredFile(input),
  });
}

export function useDownloadFileMutation() {
  return useMutation({
    mutationFn: (meta: FileMetaInfo) => downloadFile(meta),
  });
}
