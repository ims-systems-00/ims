import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ObjectStoragePort } from "./ports";

export type LocalObjectStorageOptions = {
  rootDir: string;
  /** Base URL for object GET/PUT, e.g. http://127.0.0.1:3001/api/v1/files/local/object */
  objectEndpointUrl: string;
  signingSecret: string;
};

type LocalPurpose = "upload" | "view";

function assertSafeSegment(value: string, label: string): void {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("..") || trimmed.includes("\\")) {
    throw new Error(`Invalid ${label}`);
  }
}

function signPayload(
  secret: string,
  input: { bucket: string; key: string; exp: number; purpose: LocalPurpose }
): string {
  const payload = `${input.purpose}:${input.bucket}:${input.key}:${input.exp}`;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function verifySignature(
  secret: string,
  input: {
    bucket: string;
    key: string;
    exp: number;
    purpose: LocalPurpose;
    sig: string;
  }
): boolean {
  if (!input.sig || input.exp * 1000 < Date.now()) {
    return false;
  }
  const expected = signPayload(secret, input);
  try {
    const a = Buffer.from(input.sig, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function resolveObjectPath(rootDir: string, bucket: string, key: string): string {
  assertSafeSegment(bucket, "bucket");
  assertSafeSegment(key, "key");
  const root = path.resolve(rootDir);
  const filePath = path.resolve(root, bucket, key);
  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== root) {
    throw new Error("Invalid object path");
  }
  return filePath;
}

function buildSignedUrl(
  endpoint: string,
  secret: string,
  input: {
    bucket: string;
    key: string;
    expiresInSeconds: number;
    purpose: LocalPurpose;
    downloadFileName?: string;
  }
): string {
  const exp =
    Math.floor(Date.now() / 1000) + Math.max(1, input.expiresInSeconds);
  const sig = signPayload(secret, {
    bucket: input.bucket,
    key: input.key,
    exp,
    purpose: input.purpose,
  });
  const params = new URLSearchParams({
    bucket: input.bucket,
    key: input.key,
    exp: String(exp),
    sig,
    purpose: input.purpose,
  });
  if (input.downloadFileName?.trim()) {
    params.set("name", input.downloadFileName.trim());
  }
  return `${endpoint}?${params.toString()}`;
}

/**
 * Disk-backed object storage for demos and local development (no AWS).
 * Upload/view URLs are signed like S3 presigned URLs so the browser can PUT/GET directly.
 */
export class LocalObjectStorageAdapter implements ObjectStoragePort {
  private readonly rootDir: string;
  private readonly objectEndpointUrl: string;
  private readonly signingSecret: string;

  constructor(options: LocalObjectStorageOptions) {
    this.rootDir = options.rootDir;
    this.objectEndpointUrl = options.objectEndpointUrl.replace(/\/+$/, "");
    this.signingSecret = options.signingSecret;
  }

  async createUploadUrl(input: {
    bucket: string;
    key: string;
    expiresInSeconds: number;
  }): Promise<string> {
    return buildSignedUrl(this.objectEndpointUrl, this.signingSecret, {
      bucket: input.bucket,
      key: input.key,
      expiresInSeconds: input.expiresInSeconds,
      purpose: "upload",
    });
  }

  async createViewUrl(input: {
    bucket: string;
    key: string;
    expiresInSeconds: number;
    downloadFileName?: string;
  }): Promise<string> {
    return buildSignedUrl(this.objectEndpointUrl, this.signingSecret, {
      bucket: input.bucket,
      key: input.key,
      expiresInSeconds: input.expiresInSeconds,
      purpose: "view",
      downloadFileName: input.downloadFileName,
    });
  }

  async deleteObject(input: { bucket: string; key: string }): Promise<void> {
    const filePath = resolveObjectPath(this.rootDir, input.bucket, input.key);
    await rm(filePath, { force: true });
  }

  verifySignedRequest(query: Record<string, unknown>, purpose: LocalPurpose): {
    bucket: string;
    key: string;
    downloadFileName?: string;
  } {
    const bucket = String(query.bucket ?? "");
    const key = String(query.key ?? "");
    const exp = Number(query.exp);
    const sig = String(query.sig ?? "");
    if (
      !verifySignature(this.signingSecret, {
        bucket,
        key,
        exp,
        purpose,
        sig,
      })
    ) {
      throw new Error("Invalid or expired signed URL");
    }
    const name = query.name ? String(query.name) : undefined;
    return { bucket, key, downloadFileName: name };
  }

  async writeObject(input: {
    bucket: string;
    key: string;
    body: Buffer;
  }): Promise<void> {
    const filePath = resolveObjectPath(this.rootDir, input.bucket, input.key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, input.body);
  }

  async readObject(input: { bucket: string; key: string }): Promise<Buffer> {
    const filePath = resolveObjectPath(this.rootDir, input.bucket, input.key);
    return readFile(filePath);
  }
}

export function createLocalObjectStorageAdapter(
  options: LocalObjectStorageOptions
): LocalObjectStorageAdapter {
  return new LocalObjectStorageAdapter(options);
}
