import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";

describe("Files HTTP", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp({
      FILES_ENABLED: "true",
      FILES_PROVIDER: "memory",
      AWS_PRIVATE_BUCKET: "ims-test-private",
      AWS_PUBLIC_BUCKET: "ims-public-media",
      ALLOWED_FILE_PATHS: "general,risks,profile",
    });
  }, 60_000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  it("GET /api/v1/files/signed-url/uploads returns upload URL + metadata", async () => {
    const response = await request(ctx!.app)
      .get("/api/v1/files/signed-url/uploads")
      .set("x-file-key", "reports/quarterly.pdf")
      .set("x-file-path", "risks");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.url).toContain("memory://upload/");
    expect(response.body.data.uploadInformation).toMatchObject({
      Name: "quarterly.pdf",
      Bucket: "ims-test-private",
    });
    expect(response.body.data.uploadInformation.Key).toMatch(
      /^[0-9a-f-]{36}\.pdf$/i
    );
    expect(response.body.data.uploadInformation.key).toBe(
      response.body.data.uploadInformation.Key
    );
  });

  it("GET /api/v1/files/signed-url returns a view URL", async () => {
    const response = await request(ctx!.app)
      .get("/api/v1/files/signed-url")
      .set("x-file-bucket", "ims-test-private")
      .set("x-file-key", "123e4567-e89b-12d3-a456-426614174000.pdf")
      .set("x-file-name", "quarterly.pdf");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.url).toContain("memory://view/");
    expect(response.body.data.url).toContain("quarterly.pdf");
  });

  it("DELETE /api/v1/files removes the object key", async () => {
    const response = await request(ctx!.app)
      .delete("/api/v1/files")
      .set("x-file-key", "123e4567-e89b-12d3-a456-426614174000.pdf");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({
      Bucket: "ims-test-private",
      Key: "123e4567-e89b-12d3-a456-426614174000.pdf",
    });
  });

  it("rejects view URLs for another organisation's bucket", async () => {
    const response = await request(ctx!.app)
      .get("/api/v1/files/signed-url")
      .set("x-file-bucket", "someone-elses-bucket")
      .set("x-file-key", "123e4567-e89b-12d3-a456-426614174000.pdf");
    expect(response.status).toBe(403);
  });

  it("rejects traversal-style file keys", async () => {
    const response = await request(ctx!.app)
      .delete("/api/v1/files")
      .set("x-file-key", encodeURIComponent("../secret.pdf"));
    expect(response.status).toBe(400);
  });

  it("rejects upload without x-file-key", async () => {
    const response = await request(ctx!.app).get(
      "/api/v1/files/signed-url/uploads"
    );
    expect(response.status).toBe(400);
  });

  it("rejects disallowed x-file-path", async () => {
    const response = await request(ctx!.app)
      .get("/api/v1/files/signed-url/uploads")
      .set("x-file-key", "a.pdf")
      .set("x-file-path", "secrets");
    expect(response.status).toBe(400);
  });
});
