import { describe, expect, it } from "vitest";
import {
  buildCorsConfiguration,
  buildOrgBucketName,
  ensureFilesBucket,
} from "../src/infrastructure/s3/bucket-provisioning";

type Sent = { name: string; input: unknown };

function fakeSender(options: { bucketExists: boolean }) {
  const sent: Sent[] = [];
  return {
    sent,
    async send(command: { input: unknown }) {
      const name =
        (command as { constructor?: { name?: string } }).constructor?.name ??
        "unknown";
      sent.push({ name, input: command.input });
      if (name === "HeadBucketCommand" && !options.bucketExists) {
        const error = new Error("Not Found") as Error & {
          $metadata?: { httpStatusCode?: number };
        };
        error.name = "NotFound";
        error.$metadata = { httpStatusCode: 404 };
        throw error;
      }
      return {};
    },
  };
}

describe("bucket provisioning", () => {
  it("builds per-organisation bucket names", () => {
    expect(buildOrgBucketName("org_123", "-ims-private")).toBe(
      "org_123-ims-private"
    );
    expect(() => buildOrgBucketName("", "-x")).toThrow(/organizationId/);
    expect(() => buildOrgBucketName("org_123", "")).toThrow(/AWS_BUCKET_SUFFIX/);
  });

  it("builds CORS config for browser presigned uploads", () => {
    const cors = buildCorsConfiguration(["http://localhost:3000"]);
    expect(cors.CORSRules[0].AllowedOrigins).toEqual(["http://localhost:3000"]);
    expect(cors.CORSRules[0].AllowedMethods).toContain("PUT");
    expect(() => buildCorsConfiguration([])).toThrow(/CORS origin/);
  });

  it("creates a missing bucket then applies block/encryption/CORS", async () => {
    const sender = fakeSender({ bucketExists: false });
    const result = await ensureFilesBucket(sender, {
      bucket: "org_123-ims-private",
      region: "eu-west-2",
      corsOrigins: ["http://localhost:3000"],
    });
    expect(result).toEqual({ bucket: "org_123-ims-private", created: true });
    expect(sender.sent.map((s) => s.name)).toEqual([
      "HeadBucketCommand",
      "CreateBucketCommand",
      "PutPublicAccessBlockCommand",
      "PutBucketEncryptionCommand",
      "PutBucketCorsCommand",
    ]);
  });

  it("is idempotent for an existing bucket", async () => {
    const sender = fakeSender({ bucketExists: true });
    const result = await ensureFilesBucket(sender, {
      bucket: "org_123-ims-private",
      region: "eu-west-2",
      corsOrigins: ["http://localhost:3000"],
    });
    expect(result.created).toBe(false);
    expect(
      sender.sent.some((s) => s.name === "CreateBucketCommand")
    ).toBe(false);
  });
});
