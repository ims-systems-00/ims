import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import {
  createAssetBusinessUnitLookupAdapter,
  createAssetCategoryLookupAdapter,
  createAssetUserLookupAdapter,
} from "../src/modules/assets";
import { createOrganisationMembershipRepository } from "../src/modules/organisation/repositories/organisation-membership.repository";
import { getOrganisationMembershipModel } from "../src/modules/organisation/repositories/organisation-membership.model";
import { createFunctionalUnitRepository } from "../src/modules/functional-units/repositories/functional-unit.repository";
import { getFunctionalUnitModel } from "../src/modules/functional-units/repositories/functional-unit.model";
import { createTagAndCategoryRepository } from "../src/modules/tags-and-categories/repositories/tag-and-category.repository";
import { getTagAndCategoryModel } from "../src/modules/tags-and-categories/repositories/tag-and-category.model";

const ORG_A = "org-a-assets";
const ORG_B = "org-b-assets";

describe("Assets lookups adapters (A-01)", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  beforeEach(async () => {
    await getOrganisationMembershipModel().deleteMany({});
    await getFunctionalUnitModel().deleteMany({});
    await getTagAndCategoryModel().deleteMany({});
  });

  it("owner lookup requires membership in the same organisation", async () => {
    await createOrganisationMembershipRepository().create({
      organizationId: ORG_A,
      userId: "user-a",
      role: "Basic",
      createdOn: new Date(),
    });

    const users = createAssetUserLookupAdapter();
    await expect(users.existsInOrganization(ORG_A, "user-a")).resolves.toBe(true);
    await expect(users.existsInOrganization(ORG_B, "user-a")).resolves.toBe(false);
    await expect(users.existsInOrganization(ORG_A, "nobody")).resolves.toBe(false);
    await expect(users.existsInOrganization(ORG_A, "  ")).resolves.toBe(false);
  });

  it("business unit lookup requires a unit in the same organisation", async () => {
    const unit = await createFunctionalUnitRepository().create(ORG_A, {
      reference: "FU-1",
      name: "Operations",
      accessType: "Internal business function",
      responsibility: "Operations",
      operatingLocation: "HQ",
      standards: "ISO 9001",
    });

    const units = createAssetBusinessUnitLookupAdapter();
    await expect(units.existsInOrganization(ORG_A, unit.id)).resolves.toBe(true);
    await expect(units.existsInOrganization(ORG_B, unit.id)).resolves.toBe(false);
    await expect(units.existsInOrganization(ORG_A, "not-an-id")).resolves.toBe(false);
  });

  it("category lookup requires org tag applicable to the asset module", async () => {
    const tags = createTagAndCategoryRepository();
    const hardware = await tags.create(ORG_A, {
      name: "Hardware cat",
      description: "",
      applicableModules: ["hardwareassets"],
      createdBy: "tester",
      createdOn: new Date(),
    });
    const generic = await tags.create(ORG_A, {
      name: "Generic",
      description: "",
      applicableModules: [],
      createdBy: "tester",
      createdOn: new Date(),
    });

    const categories = createAssetCategoryLookupAdapter();
    await expect(
      categories.existsForAssetModule(ORG_A, "hardwareassets", hardware.id)
    ).resolves.toBe(true);
    await expect(
      categories.existsForAssetModule(ORG_A, "softwareassets", hardware.id)
    ).resolves.toBe(false);
    await expect(
      categories.existsForAssetModule(ORG_A, "softwareassets", generic.id)
    ).resolves.toBe(true);
    await expect(
      categories.existsForAssetModule(ORG_B, "hardwareassets", hardware.id)
    ).resolves.toBe(false);
    await expect(
      categories.existsForAssetModule(ORG_A, "hardwareassets", "nope")
    ).resolves.toBe(false);
  });
});
