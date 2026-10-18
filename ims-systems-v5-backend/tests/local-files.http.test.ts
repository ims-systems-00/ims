import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";

describe("Local files HTTP", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp({
      FILES_ENABLED: "true",
      FILES_PROVIDER: "local",
      FILES_LOCAL_ROOT: ".local-files-test",
      FILES_LOCAL_SIGNING_SECRET: "test-local-signing-secret",
      AWS_PRIVATE_BUCKET: "ims-test-local",
      ALLOWED_FILE_PATHS: "general",
    });
  }, 60_000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  it("uploads via signed URL and downloads via view URL", async () => {
    const uploadMeta = await request(ctx!.app)
      .get("/api/v1/files/signed-url/uploads")
      .set("x-file-key", "demo.pdf")
      .set("x-file-path", "general");

    expect(uploadMeta.status).toBe(200);
    const uploadUrl = uploadMeta.body.data.url as string;
    expect(uploadUrl).toContain("/files/local/object");

    const pdfBytes = Buffer.from("%PDF-1.4 demo");
    const put = await request(ctx!.app)
      .put(uploadUrl.replace(/^https?:\/\/[^/]+/, ""))
      .set("Content-Type", "application/pdf")
      .send(pdfBytes);

    expect(put.status).toBe(204);

    const viewMeta = await request(ctx!.app)
      .get("/api/v1/files/signed-url")
      .set("x-file-bucket", uploadMeta.body.data.uploadInformation.Bucket)
      .set("x-file-key", uploadMeta.body.data.uploadInformation.Key)
      .set("x-file-name", "demo.pdf");

    expect(viewMeta.status).toBe(200);
    const viewUrl = viewMeta.body.data.url as string;
    const get = await request(ctx!.app).get(
      viewUrl.replace(/^https?:\/\/[^/]+/, "")
    );

    expect(get.status).toBe(200);
    expect(get.headers["content-type"]).toContain("application/pdf");
    expect(get.body).toEqual(pdfBytes);
  });
});
