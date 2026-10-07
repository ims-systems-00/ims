import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import {
  getDocumentRepositoryModel,
  getDocumentTreeModel,
} from "../src/modules/document-management";
import { DEV_STUB_IDENTITY, DEV_STUB_ORGANIZATION_ID } from "../src/security";

const fileMeta = {
  Name: "policy.pdf",
  Key: "uuid-policy.pdf",
  key: "uuid-policy.pdf",
  Bucket: "ims-test-private",
};

describe("Document Management HTTP", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp({
      FILES_ENABLED: "true",
      FILES_PROVIDER: "memory",
      AWS_PRIVATE_BUCKET: "ims-test-private",
    });
  }, 60_000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  beforeEach(async () => {
    await getDocumentTreeModel().deleteMany({});
    await getDocumentRepositoryModel().deleteMany({});
  });

  it("creates a repository and lists it", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/document-repositories")
      .send({
        name: "Policies",
        description: "Controlled policies",
        privacy: "Organisational",
        owners: [DEV_STUB_IDENTITY.subjectId],
        reviewInterval: "Yearly",
      });

    expect(created.status).toBe(201);
    expect(created.body.success).toBe(true);
    expect(created.body.data).toMatchObject({
      name: "Policies",
      privacy: "Organisational",
      organizationId: DEV_STUB_ORGANIZATION_ID,
    });
    expect(created.body.data.reference).toMatch(/^REP-/);

    const listed = await request(ctx!.app).get(
      "/api/v1/document-repositories?page=1&pageSize=20"
    );
    expect(listed.status).toBe(200);
    expect(listed.body.data.total).toBe(1);
    expect(listed.body.data.items[0].id).toBe(created.body.data.id);
  });

  it("creates folders and published file nodes", async () => {
    const repo = await request(ctx!.app)
      .post("/api/v1/document-repositories")
      .send({
        name: "Library",
        privacy: "Organisational",
        owners: [DEV_STUB_IDENTITY.subjectId],
      });
    const repoId = repo.body.data.id as string;

    const folder = await request(ctx!.app)
      .post(`/api/v1/document-repositories/${repoId}/folder-nodes`)
      .send({ name: "SOPs" });
    expect(folder.status).toBe(201);
    expect(folder.body.data.type).toBe("folder");
    expect(folder.body.data.reference).toMatch(/^DOC-/);

    const files = await request(ctx!.app)
      .post(`/api/v1/document-repositories/${repoId}/file-nodes`)
      .send({
        parentNode: folder.body.data.id,
        data: [
          {
            storageInfo: fileMeta,
            purpose: "Policy",
            applicableModules: ["risks"],
          },
        ],
      });
    expect(files.status).toBe(201);
    expect(files.body.data.created).toHaveLength(1);
    expect(files.body.data.created[0].status).toBe("Published");
    expect(files.body.data.created[0].documentData.purpose).toBe("Policy");
    expect(files.body.data.skipped).toEqual([]);

    const overview = await request(ctx!.app).get(
      "/api/v1/document-management/overview"
    );
    expect(overview.status).toBe(200);
    expect(overview.body.data.total).toBe(1);
    expect(overview.body.data.byPurpose.Policy).toBe(1);

    const picker = await request(ctx!.app).get(
      "/api/v1/document-trees?applicableModule=risks"
    );
    expect(picker.status).toBe(200);
    expect(picker.body.data.total).toBe(1);
    expect(picker.body.data.items[0].name).toBe("policy.pdf");
  });

  it("runs authorisation pending → published and archives previous version", async () => {
    const repo = await request(ctx!.app)
      .post("/api/v1/document-repositories")
      .send({
        name: "Auth Lib",
        privacy: "Organisational",
        owners: [DEV_STUB_IDENTITY.subjectId],
      });
    const repoId = repo.body.data.id as string;

    const first = await request(ctx!.app)
      .post(`/api/v1/document-repositories/${repoId}/file-nodes`)
      .send({
        data: [{ storageInfo: fileMeta, purpose: "Document" }],
      });
    const publishedId = first.body.data.created[0].id as string;

    const version = await request(ctx!.app)
      .post(
        `/api/v1/document-repositories/${repoId}/nodes/${publishedId}/new-version`
      )
      .send({
        data: {
          storageInfo: {
            ...fileMeta,
            Key: "uuid-policy-v2.pdf",
            key: "uuid-policy-v2.pdf",
          },
          authorisation: [DEV_STUB_IDENTITY.subjectId],
        },
      });
    expect(version.status).toBe(201);
    expect(version.body.data.status).toBe("Pending");
    const pendingId = version.body.data.id as string;
    const authId = version.body.data.documentData.authorisation[0].id as string;
    expect(authId).toBeTruthy();

    const decided = await request(ctx!.app)
      .put(
        `/api/v1/document-repositories/${repoId}/nodes/${pendingId}/authorisation/${authId}`
      )
      .send({ status: "Approved", message: "Looks good" });
    expect(decided.status).toBe(200);
    expect(decided.body.data.status).toBe("Published");

    const old = await request(ctx!.app).get(
      `/api/v1/document-repositories/${repoId}/nodes/${publishedId}`
    );
    expect(old.status).toBe(200);
    expect(old.body.data.status).toBe("Archived");
  });

  it("soft-deletes a repository into the recycle bin", async () => {
    const repo = await request(ctx!.app)
      .post("/api/v1/document-repositories")
      .send({
        name: "Temp",
        privacy: "Organisational",
        owners: [DEV_STUB_IDENTITY.subjectId],
      });
    const repoId = repo.body.data.id as string;

    const soft = await request(ctx!.app).delete(
      `/api/v1/document-repositories/${repoId}/soft`
    );
    expect(soft.status).toBe(200);
    expect(soft.body.data.deletedAt).toBeTruthy();

    const active = await request(ctx!.app).get(
      "/api/v1/document-repositories?deleted=false"
    );
    expect(active.body.data.total).toBe(0);

    const bin = await request(ctx!.app).get(
      "/api/v1/document-repositories?deleted=true"
    );
    expect(bin.body.data.total).toBe(1);

    const restored = await request(ctx!.app).put(
      `/api/v1/document-repositories/${repoId}/restore`
    );
    expect(restored.status).toBe(200);
    expect(restored.body.data.deletedAt).toBeNull();
  });

  it("skips duplicate file names at the same location", async () => {
    const repo = await request(ctx!.app)
      .post("/api/v1/document-repositories")
      .send({
        name: "Dupes",
        privacy: "Organisational",
        owners: [DEV_STUB_IDENTITY.subjectId],
      });
    const repoId = repo.body.data.id as string;

    await request(ctx!.app)
      .post(`/api/v1/document-repositories/${repoId}/file-nodes`)
      .send({ data: [{ storageInfo: fileMeta }] });

    const second = await request(ctx!.app)
      .post(`/api/v1/document-repositories/${repoId}/file-nodes`)
      .send({ data: [{ storageInfo: fileMeta }] });

    expect(second.status).toBe(201);
    expect(second.body.data.created).toHaveLength(0);
    expect(second.body.data.skipped).toEqual(["policy.pdf"]);
  });
});
