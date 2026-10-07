import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getTagAndCategoryModel } from "../src/modules/tags-and-categories/repositories/tag-and-category.model";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security";

const otherOrgId = "000000000000000000000099";

const validBody = {
  name: "Strategic",
  description: "Strategic classification",
  applicableModules: ["risks", "customers"],
};

describe("Tags and Categories HTTP", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  beforeEach(async () => {
    await getTagAndCategoryModel().deleteMany({});
  });

  it("POST /api/v1/tags-and-categories creates a label", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/tags-and-categories")
      .send(validBody);
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      name: "Strategic",
      description: "Strategic classification",
      applicableModules: ["risks", "customers"],
      organizationId: DEV_STUB_ORGANIZATION_ID,
    });
  });

  it("allows create with name only", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/tags-and-categories")
      .send({ name: "Minimal" });
    expect(response.status).toBe(201);
    expect(response.body.data.description).toBe("");
    expect(response.body.data.applicableModules).toEqual([]);
  });

  it("rejects empty name and unsupported modules", async () => {
    const empty = await request(ctx!.app)
      .post("/api/v1/tags-and-categories")
      .send({ name: "  " });
    expect(empty.status).toBe(400);

    const badModule = await request(ctx!.app)
      .post("/api/v1/tags-and-categories")
      .send({
        name: "Bad",
        applicableModules: ["documents"],
      });
    expect(badModule.status).toBe(400);
  });

  it("lists with search and applicableModule filter; never returns other-org", async () => {
    await request(ctx!.app).post("/api/v1/tags-and-categories").send(validBody);
    await request(ctx!.app).post("/api/v1/tags-and-categories").send({
      name: "Incident only",
      applicableModules: ["incidents"],
    });
    await getTagAndCategoryModel().create({
      organizationId: otherOrgId,
      name: "Other org label",
      description: "leak",
      applicableModules: ["risks"],
      createdBy: "other",
      createdOn: new Date(),
    });

    const all = await request(ctx!.app).get("/api/v1/tags-and-categories");
    expect(all.status).toBe(200);
    expect(all.body.data.total).toBe(2);
    expect(
      all.body.data.items.every(
        (row: { organizationId: string }) =>
          row.organizationId === DEV_STUB_ORGANIZATION_ID
      )
    ).toBe(true);

    const risksOnly = await request(ctx!.app).get(
      "/api/v1/tags-and-categories?applicableModule=risks"
    );
    expect(risksOnly.body.data.total).toBe(1);
    expect(risksOnly.body.data.items[0].name).toBe("Strategic");

    const search = await request(ctx!.app).get(
      "/api/v1/tags-and-categories?search=Incident"
    );
    expect(search.body.data.total).toBe(1);
    expect(search.body.data.items[0].name).toBe("Incident only");
  });

  it("GET /:id is organisation-scoped", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/tags-and-categories")
      .send(validBody);
    const id = created.body.data.id as string;

    const ok = await request(ctx!.app).get(
      `/api/v1/tags-and-categories/${id}`
    );
    expect(ok.status).toBe(200);

    await getTagAndCategoryModel().updateOne(
      { _id: id },
      { organizationId: otherOrgId }
    );
    const denied = await request(ctx!.app).get(
      `/api/v1/tags-and-categories/${id}`
    );
    expect(denied.status).toBe(404);
  });

  it("PATCH updates name/description but ignores applicableModules", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/tags-and-categories")
      .send(validBody);
    const id = created.body.data.id as string;

    const updated = await request(ctx!.app)
      .patch(`/api/v1/tags-and-categories/${id}`)
      .send({
        name: "Strategic (renamed)",
        description: "Updated",
        applicableModules: ["incidents"],
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe("Strategic (renamed)");
    expect(updated.body.data.description).toBe("Updated");
    expect(updated.body.data.applicableModules).toEqual([
      "risks",
      "customers",
    ]);
  });

  it("DELETE hard-removes the label", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/tags-and-categories")
      .send(validBody);
    const id = created.body.data.id as string;

    const removed = await request(ctx!.app).delete(
      `/api/v1/tags-and-categories/${id}`
    );
    expect(removed.status).toBe(200);

    const missing = await request(ctx!.app).get(
      `/api/v1/tags-and-categories/${id}`
    );
    expect(missing.status).toBe(404);
  });
});
