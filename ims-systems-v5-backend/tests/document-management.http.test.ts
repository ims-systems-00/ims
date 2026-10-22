import { createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import {
  getDocumentAccessTokenModel,
  getDocumentRepositoryModel,
  getDocumentSignatureModel,
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
    await getDocumentSignatureModel().deleteMany({});
    await getDocumentAccessTokenModel().deleteMany({});
  });

  async function createRepoWithDocument() {
    const repo = await request(ctx!.app)
      .post("/api/v1/document-repositories")
      .send({
        name: "Library",
        privacy: "Organisational",
        owners: [DEV_STUB_IDENTITY.subjectId],
      });
    const repoId = repo.body.data.id as string;
    const files = await request(ctx!.app)
      .post(`/api/v1/document-repositories/${repoId}/file-nodes`)
      .send({ data: [{ storageInfo: fileMeta, purpose: "Policy" }] });
    const nodeId = files.body.data.created[0].id as string;
    return { repoId, nodeId };
  }

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

  it("lists the version family for a document node", async () => {
    const { repoId, nodeId } = await createRepoWithDocument();

    const version = await request(ctx!.app)
      .post(`/api/v1/document-repositories/${repoId}/nodes/${nodeId}/new-version`)
      .send({
        data: {
          storageInfo: {
            ...fileMeta,
            Key: "uuid-policy-v2.pdf",
            key: "uuid-policy-v2.pdf",
          },
        },
      });
    expect(version.status).toBe(201);

    const versions = await request(ctx!.app).get(
      `/api/v1/document-repositories/${repoId}/nodes/${nodeId}/versions`
    );
    expect(versions.status).toBe(200);
    expect(versions.body.data).toHaveLength(2);
    expect(
      versions.body.data.map(
        (row: { documentData?: { dvID?: number } }) => row.documentData?.dvID
      )
    ).toEqual([1, 2]);
  });

  it("shares by email with validation and resolves share tokens", async () => {
    const { repoId, nodeId } = await createRepoWithDocument();

    const invalid = await request(ctx!.app)
      .post(`/api/v1/document-repositories/${repoId}/nodes/${nodeId}/share`)
      .send({ emails: ["not-an-email"] });
    expect(invalid.status).toBe(400);

    const shared = await request(ctx!.app)
      .post(`/api/v1/document-repositories/${repoId}/nodes/${nodeId}/share`)
      .send({ emails: ["Partner@Example.com"], message: "Please review" });
    expect(shared.status).toBe(200);
    expect(shared.body.data.sharedWith).toEqual(["partner@example.com"]);

    const unknown = await request(ctx!.app).get(
      `/api/v1/document-shares/${"a".repeat(64)}`
    );
    expect(unknown.status).toBe(404);

    // Seed a share token directly (only its hash is stored).
    const rawToken = "b".repeat(64);
    await getDocumentAccessTokenModel().create({
      organizationId: DEV_STUB_ORGANIZATION_ID,
      documentNodeId: nodeId,
      purpose: "share",
      tokenHash: createHash("sha256").update(rawToken).digest("hex"),
      recipientEmail: "partner@example.com",
      createdBy: DEV_STUB_IDENTITY.subjectId,
      expiresAt: new Date(Date.now() + 60_000),
      invalidatedAt: null,
      lastUsedAt: null,
    });

    const resolved = await request(ctx!.app).get(
      `/api/v1/document-shares/${rawToken}`
    );
    expect(resolved.status).toBe(302);
    expect(resolved.headers.location).toContain("memory://");
  });

  it("runs the signature invite → list → resend → remove flow", async () => {
    const { repoId, nodeId } = await createRepoWithDocument();

    const invited = await request(ctx!.app)
      .post(`/api/v1/document-repositories/${repoId}/nodes/${nodeId}/signatures`)
      .send({
        internalUsers: [
          {
            userId: DEV_STUB_IDENTITY.subjectId,
            displayName: "Dev Stub",
            email: "dev@example.com",
          },
        ],
        externalEmails: ["external@example.com"],
        message: "Please sign",
        signatureLocations: [{ page: 1, x: 0.1, y: 0.8 }],
      });
    expect(invited.status).toBe(201);
    expect(invited.body.data).toHaveLength(2);

    const listed = await request(ctx!.app).get(
      `/api/v1/document-repositories/${repoId}/nodes/${nodeId}/signatures`
    );
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(2);
    expect(
      listed.body.data.every(
        (row: { status: string }) => row.status === "Pending"
      )
    ).toBe(true);

    // Conformance is tracked (0 of 2 signed) rather than hidden (-1).
    const node = await request(ctx!.app).get(
      `/api/v1/document-repositories/${repoId}/nodes/${nodeId}`
    );
    expect(node.body.data.documentData.conformance).toBe(0);

    const external = listed.body.data.find(
      (row: { inviteeType: string }) => row.inviteeType === "email"
    );
    const resent = await request(ctx!.app).post(
      `/api/v1/document-repositories/${repoId}/nodes/${nodeId}/signatures/${external.id}/resend`
    );
    expect(resent.status).toBe(200);

    const removed = await request(ctx!.app).delete(
      `/api/v1/document-repositories/${repoId}/nodes/${nodeId}/signatures/${external.id}`
    );
    expect(removed.status).toBe(200);

    const afterRemove = await request(ctx!.app).get(
      `/api/v1/document-repositories/${repoId}/nodes/${nodeId}/signatures`
    );
    expect(afterRemove.body.data).toHaveLength(1);

    const requests = await request(ctx!.app).get(
      "/api/v1/document-signatures/requests?mine=true"
    );
    expect(requests.status).toBe(200);
    expect(requests.body.data).toHaveLength(1);

    const publicUnknown = await request(ctx!.app).get(
      `/api/v1/document-signatures/public/${"c".repeat(64)}`
    );
    expect(publicUnknown.status).toBe(404);
  });

  it("forbids cross-org copy sources for non-Super-Admins", async () => {
    const sources = await request(ctx!.app).get(
      "/api/v1/document-repositories/cross-org-copy-sources"
    );
    expect(sources.status).toBe(403);

    const { repoId } = await createRepoWithDocument();
    const copy = await request(ctx!.app)
      .post(`/api/v1/document-repositories/${repoId}/copy-folder-structure`)
      .send({
        sourceRepoId: repoId,
        sourceOrgId: "64a000000000000000000001",
      });
    expect(copy.status).toBe(403);
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
