/**
 * Shared file metadata saved on parent business records.
 * Spec: docs/module-specifications/file-handler.md
 */
export type FileMetaInfo = {
  Name: string;
  Key: string;
  /** Alias kept for V4 FE compatibility. */
  key: string;
  Bucket: string;
};

export type CreateUploadUrlInput = {
  /** Original filename (may include path segments; basename is used for Name). */
  fileName: string;
  /** Optional logical path prefix, e.g. risks / profile / general. */
  path?: string;
  /** When true (or equals public bucket name), use the public bucket. */
  publicBucket?: string | boolean;
  /** Browser-reported MIME type; bound into the signed PUT when present. */
  contentType?: string;
  /** Browser-reported byte size; validated and bound into the signed PUT. */
  fileSize?: number;
};

export type CreateUploadUrlResult = {
  url: string;
  uploadInformation: FileMetaInfo;
  expiresInSeconds: number;
};

export type CreateViewUrlInput = {
  bucket: string;
  key: string;
  fileName?: string;
  /**
   * How the browser should treat the file when the URL is opened.
   * "inline" (default) renders in-app previews; "attachment" is only
   * for explicit downloads.
   */
  disposition?: "inline" | "attachment";
};

export type CreateViewUrlResult = {
  url: string;
  expiresInSeconds: number;
};

export type DeleteFileInput = {
  key: string;
  /** Optional; defaults to private bucket. */
  bucket?: string;
};

export type DeleteFileResult = {
  Bucket: string;
  Key: string;
};
