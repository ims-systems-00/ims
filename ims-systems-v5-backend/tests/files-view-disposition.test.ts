import { describe, expect, it } from "vitest";
import { createS3Client, createS3ObjectStorageAdapter } from "../src/infrastructure/s3/object-storage";
import { createLocalObjectStorageAdapter } from "../src/modules/files/local-object-storage";
import { createLogger } from "../src/infrastructure/logging/logger";

const logger = createLogger({ level: "silent" });

function s3Adapter() {
  return createS3ObjectStorageAdapter({
    client: createS3Client({
      region: "eu-north-1",
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
    }),
    logger,
  });
}

describe("view URL content disposition (preview vs download)", () => {
  it("defaults S3 view URLs to inline so previews render instead of downloading", async () => {
    const url = await s3Adapter().createViewUrl({
      bucket: "org-bucket",
      key: "123e4567-e89b-12d3-a456-426614174000.pdf",
      expiresInSeconds: 600,
      downloadFileName: "report.pdf",
    });

    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('inline; filename="report.pdf"');
    expect(decoded).not.toContain("attachment");
    expect(decoded).toContain("application/pdf");
  });

  it("uses attachment only when a download is explicitly requested", async () => {
    const url = await s3Adapter().createViewUrl({
      bucket: "org-bucket",
      key: "123e4567-e89b-12d3-a456-426614174000.pdf",
      expiresInSeconds: 600,
      downloadFileName: "report.pdf",
      disposition: "attachment",
    });

    expect(decodeURIComponent(url)).toContain(
      'attachment; filename="report.pdf"'
    );
  });

  it("carries the disposition through local-storage signed URLs", async () => {
    const local = createLocalObjectStorageAdapter({
      rootDir: "/tmp/ims-files-disposition-test",
      objectEndpointUrl: "http://127.0.0.1:3001/api/v1/files/local/object",
      signingSecret: "test-secret",
    });

    const inlineUrl = await local.createViewUrl({
      bucket: "org-bucket",
      key: "file.pdf",
      expiresInSeconds: 600,
      downloadFileName: "report.pdf",
    });
    const inlineParams = Object.fromEntries(
      new URL(inlineUrl).searchParams.entries()
    );
    expect(local.verifySignedRequest(inlineParams, "view").disposition).toBe(
      "inline"
    );

    const downloadUrl = await local.createViewUrl({
      bucket: "org-bucket",
      key: "file.pdf",
      expiresInSeconds: 600,
      downloadFileName: "report.pdf",
      disposition: "attachment",
    });
    const downloadParams = Object.fromEntries(
      new URL(downloadUrl).searchParams.entries()
    );
    expect(
      local.verifySignedRequest(downloadParams, "view").disposition
    ).toBe("attachment");
  });
});
