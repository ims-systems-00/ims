import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import type {
  BusinessUnitLookupPort,
  CategoryLookupPort,
  UserLookupPort,
} from "../ports";
import type { HardwareAssetRepository } from "../repositories/hardware.repository";
import type { InformationAssetRepository } from "../repositories/information.repository";
import type { PeopleAssetRepository } from "../repositories/people.repository";
import type { PremiseAssetRepository } from "../repositories/premise.repository";
import type { SoftwareAssetRepository } from "../repositories/software.repository";
import {
  INVENTORY_RESOURCE,
  type CreateHardwareInput,
  type CreateInformationInput,
  type CreatePeopleInput,
  type CreatePremiseInput,
  type CreateSoftwareInput,
  type HardwareAsset,
  type InformationAsset,
  type InventoryStats,
  type ListAssetsQuery,
  type Paginated,
  type PeopleAsset,
  type PremiseAsset,
  type SoftwareAsset,
  type UpdateHardwareInput,
  type UpdateInformationInput,
  type UpdatePeopleInput,
  type UpdatePremiseInput,
  type UpdateSoftwareInput,
} from "../types";

const MODULE_KEYS = {
  hardware: "hardwareassets",
  software: "softwareassets",
  people: "peopleassets",
  premise: "premiseassets",
  information: "informationassets",
} as const;

function requireOrgIdentity(identity: SecurityIdentity | null | undefined): {
  identity: SecurityIdentity;
  organizationId: string;
} {
  if (!identity?.subjectId) {
    throw new UnauthorizedError();
  }
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return { identity, organizationId: identity.organizationId };
}

export type AssetsServiceDeps = {
  hardware: HardwareAssetRepository;
  software: SoftwareAssetRepository;
  people: PeopleAssetRepository;
  premise: PremiseAssetRepository;
  information: InformationAssetRepository;
  authorizer: Authorizer;
  users: UserLookupPort;
  businessUnits: BusinessUnitLookupPort;
  categories: CategoryLookupPort;
};

export function createAssetsService(deps: AssetsServiceDeps) {
  const {
    hardware,
    software,
    people,
    premise,
    information,
    authorizer,
    users,
    businessUnits,
    categories,
  } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: string,
    resourceId?: string
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: INVENTORY_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access inventory assets"
      );
    }
  }

  /**
   * Delete requires INVENTORY DELETE plus creator or org-admin (`manage`).
   * Spec: admin or creator (assets.md §8 / §9).
   */
  async function assertCanDelete(
    identity: SecurityIdentity,
    createdBy: string,
    resourceId: string
  ): Promise<void> {
    await assertAllowed(identity, "delete", resourceId);
    if (createdBy === identity.subjectId) {
      return;
    }
    const isAdmin = await authorizer.allow({
      identity,
      action: "manage",
      resourceType: INVENTORY_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!isAdmin) {
      throw new ForbiddenError(
        "Only the creator or an organisation administrator can delete this asset"
      );
    }
  }

  async function assertBusinessUnit(
    organizationId: string,
    businessUnitId: string | undefined
  ): Promise<void> {
    if (!businessUnitId) return;
    const ok = await businessUnits.existsInOrganization(
      organizationId,
      businessUnitId
    );
    if (!ok) {
      throw new ValidationAppError("Business unit was not found");
    }
  }

  async function assertCategory(
    organizationId: string,
    moduleKey: string,
    categoryId: string | undefined | null
  ): Promise<void> {
    if (!categoryId) return;
    const ok = await categories.existsForAssetModule(
      organizationId,
      moduleKey,
      categoryId
    );
    if (!ok) {
      throw new ValidationAppError("Category was not found for this asset type");
    }
  }

  async function assertOwner(
    organizationId: string,
    ownerId: string | undefined | null
  ): Promise<void> {
    if (!ownerId) return;
    const ok = await users.existsInOrganization(organizationId, ownerId);
    if (!ok) {
      throw new ValidationAppError("Owner user was not found");
    }
  }

  return {
    // ── Hardware ──────────────────────────────────────────────
    async createHardware(
      identity: SecurityIdentity | null | undefined,
      input: CreateHardwareInput
    ): Promise<HardwareAsset> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");
      await assertOwner(actor.organizationId, input.ownerId);
      await assertBusinessUnit(actor.organizationId, input.businessUnitId);
      await assertCategory(
        actor.organizationId,
        MODULE_KEYS.hardware,
        input.categoryId
      );
      return hardware.create(
        actor.organizationId,
        actor.identity.subjectId,
        input
      );
    },

    async listHardware(
      identity: SecurityIdentity | null | undefined,
      query: ListAssetsQuery
    ): Promise<Paginated<HardwareAsset>> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      // Role/business-unit scoped listing (HoS/Basic) needs Users membership —
      // not available yet. Stub lists all org assets (Super Admin behaviour).
      return hardware.list(actor.organizationId, query);
    },

    async getHardware(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<HardwareAsset> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      // V5 D-09: org-scoped get (overrides V4 “any READ by id” gap).
      const asset = await hardware.findById(actor.organizationId, id);
      if (!asset) throw new NotFoundError("Hardware asset not found");
      return asset;
    },

    async updateHardware(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateHardwareInput
    ): Promise<HardwareAsset> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const existing = await hardware.findById(actor.organizationId, id);
      if (!existing) throw new NotFoundError("Hardware asset not found");
      // businessUnitId is locked after create (assets.md).
      if ("businessUnitId" in (input as Record<string, unknown>)) {
        throw new ValidationAppError("Business unit cannot be changed after create");
      }
      if (input.ownerId !== undefined) {
        await assertOwner(actor.organizationId, input.ownerId);
      }
      await assertCategory(
        actor.organizationId,
        MODULE_KEYS.hardware,
        input.categoryId
      );
      const updated = await hardware.update(actor.organizationId, id, input);
      if (!updated) throw new NotFoundError("Hardware asset not found");
      return updated;
    },

    async deleteHardware(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      const existing = await hardware.findById(actor.organizationId, id);
      if (!existing) throw new NotFoundError("Hardware asset not found");
      await assertCanDelete(actor.identity, existing.createdBy, id);
      const deleted = await hardware.softDelete(actor.organizationId, id);
      if (!deleted) throw new ConflictError("Hardware asset could not be deleted");
    },

    // ── Software ──────────────────────────────────────────────
    async createSoftware(
      identity: SecurityIdentity | null | undefined,
      input: CreateSoftwareInput
    ): Promise<SoftwareAsset> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");
      await assertBusinessUnit(actor.organizationId, input.businessUnitId);
      await assertCategory(
        actor.organizationId,
        MODULE_KEYS.software,
        input.categoryId
      );
      return software.create(
        actor.organizationId,
        actor.identity.subjectId,
        input
      );
    },

    async listSoftware(
      identity: SecurityIdentity | null | undefined,
      query: ListAssetsQuery
    ): Promise<Paginated<SoftwareAsset>> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      return software.list(actor.organizationId, query);
    },

    async getSoftware(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<SoftwareAsset> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      const asset = await software.findById(actor.organizationId, id);
      if (!asset) throw new NotFoundError("Software asset not found");
      return asset;
    },

    async updateSoftware(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateSoftwareInput
    ): Promise<SoftwareAsset> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const existing = await software.findById(actor.organizationId, id);
      if (!existing) throw new NotFoundError("Software asset not found");
      if ("businessUnitId" in (input as Record<string, unknown>)) {
        throw new ValidationAppError("Business unit cannot be changed after create");
      }
      await assertCategory(
        actor.organizationId,
        MODULE_KEYS.software,
        input.categoryId
      );
      const updated = await software.update(
        actor.organizationId,
        id,
        input,
        actor.identity.subjectId
      );
      if (!updated) throw new NotFoundError("Software asset not found");
      return updated;
    },

    async deleteSoftware(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      const existing = await software.findById(actor.organizationId, id);
      if (!existing) throw new NotFoundError("Software asset not found");
      await assertCanDelete(actor.identity, existing.createdBy, id);
      const deleted = await software.softDelete(actor.organizationId, id);
      if (!deleted) throw new ConflictError("Software asset could not be deleted");
    },

    async addSoftwareKey(
      identity: SecurityIdentity | null | undefined,
      id: string,
      value: string
    ): Promise<SoftwareAsset> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const updated = await software.addKey(actor.organizationId, id, value);
      if (!updated) throw new NotFoundError("Software asset not found");
      return updated;
    },

    async removeSoftwareKey(
      identity: SecurityIdentity | null | undefined,
      id: string,
      keyId: string
    ): Promise<SoftwareAsset> {
      const actor = requireOrgIdentity(identity);
      // Spec: API uses DELETE permission for key removal.
      await assertAllowed(actor.identity, "delete", id);
      const existing = await software.findById(actor.organizationId, id);
      if (!existing) throw new NotFoundError("Software asset not found");
      if (!existing.keys.some((key) => key.id === keyId)) {
        throw new NotFoundError("Software key not found");
      }
      const updated = await software.removeKey(
        actor.organizationId,
        id,
        keyId
      );
      if (!updated) throw new NotFoundError("Software asset not found");
      return updated;
    },

    async addSoftwareDocument(
      identity: SecurityIdentity | null | undefined,
      id: string,
      document: {
        fileName: string;
        mimeType?: string;
        sizeBytes?: number;
        storageKey?: string;
      }
    ): Promise<SoftwareAsset> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const updated = await software.addDocument(actor.organizationId, id, {
        ...document,
        uploadedBy: actor.identity.subjectId,
      });
      if (!updated) throw new NotFoundError("Software asset not found");
      return updated;
    },

    async removeSoftwareDocument(
      identity: SecurityIdentity | null | undefined,
      id: string,
      documentId: string
    ): Promise<SoftwareAsset> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);
      const existing = await software.findById(actor.organizationId, id);
      if (!existing) throw new NotFoundError("Software asset not found");
      if (!existing.documents.some((doc) => doc.id === documentId)) {
        throw new NotFoundError("Software document not found");
      }
      const updated = await software.removeDocument(
        actor.organizationId,
        id,
        documentId
      );
      if (!updated) throw new NotFoundError("Software asset not found");
      return updated;
    },

    // ── People ────────────────────────────────────────────────
    async createPeople(
      identity: SecurityIdentity | null | undefined,
      input: CreatePeopleInput
    ): Promise<PeopleAsset> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");
      await assertBusinessUnit(actor.organizationId, input.businessUnitId);
      await assertCategory(
        actor.organizationId,
        MODULE_KEYS.people,
        input.categoryId
      );
      return people.create(
        actor.organizationId,
        actor.identity.subjectId,
        input
      );
    },

    async listPeople(
      identity: SecurityIdentity | null | undefined,
      query: ListAssetsQuery
    ): Promise<Paginated<PeopleAsset>> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      return people.list(actor.organizationId, query);
    },

    async getPeople(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<PeopleAsset> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      const asset = await people.findById(actor.organizationId, id);
      if (!asset) throw new NotFoundError("People asset not found");
      return asset;
    },

    async updatePeople(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdatePeopleInput
    ): Promise<PeopleAsset> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const existing = await people.findById(actor.organizationId, id);
      if (!existing) throw new NotFoundError("People asset not found");
      if ("businessUnitId" in (input as Record<string, unknown>)) {
        throw new ValidationAppError("Business unit cannot be changed after create");
      }
      await assertCategory(
        actor.organizationId,
        MODULE_KEYS.people,
        input.categoryId
      );
      const updated = await people.update(actor.organizationId, id, input);
      if (!updated) throw new NotFoundError("People asset not found");
      return updated;
    },

    async deletePeople(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      const existing = await people.findById(actor.organizationId, id);
      if (!existing) throw new NotFoundError("People asset not found");
      await assertCanDelete(actor.identity, existing.createdBy, id);
      const deleted = await people.softDelete(actor.organizationId, id);
      if (!deleted) throw new ConflictError("People asset could not be deleted");
    },

    // ── Premise ───────────────────────────────────────────────
    async createPremise(
      identity: SecurityIdentity | null | undefined,
      input: CreatePremiseInput
    ): Promise<PremiseAsset> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");
      await assertBusinessUnit(actor.organizationId, input.businessUnitId);
      await assertCategory(
        actor.organizationId,
        MODULE_KEYS.premise,
        input.categoryId
      );
      return premise.create(
        actor.organizationId,
        actor.identity.subjectId,
        input
      );
    },

    async listPremise(
      identity: SecurityIdentity | null | undefined,
      query: ListAssetsQuery
    ): Promise<Paginated<PremiseAsset>> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      return premise.list(actor.organizationId, query);
    },

    async getPremise(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<PremiseAsset> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      const asset = await premise.findById(actor.organizationId, id);
      if (!asset) throw new NotFoundError("Premise asset not found");
      return asset;
    },

    async updatePremise(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdatePremiseInput
    ): Promise<PremiseAsset> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const existing = await premise.findById(actor.organizationId, id);
      if (!existing) throw new NotFoundError("Premise asset not found");
      if ("businessUnitId" in (input as Record<string, unknown>)) {
        throw new ValidationAppError("Business unit cannot be changed after create");
      }
      await assertCategory(
        actor.organizationId,
        MODULE_KEYS.premise,
        input.categoryId
      );
      const updated = await premise.update(actor.organizationId, id, input);
      if (!updated) throw new NotFoundError("Premise asset not found");
      return updated;
    },

    async deletePremise(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      const existing = await premise.findById(actor.organizationId, id);
      if (!existing) throw new NotFoundError("Premise asset not found");
      await assertCanDelete(actor.identity, existing.createdBy, id);
      const deleted = await premise.softDelete(actor.organizationId, id);
      if (!deleted) throw new ConflictError("Premise asset could not be deleted");
    },

    // ── Information ───────────────────────────────────────────
    async createInformation(
      identity: SecurityIdentity | null | undefined,
      input: CreateInformationInput
    ): Promise<InformationAsset> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");
      await assertOwner(actor.organizationId, input.ownerId);
      await assertBusinessUnit(actor.organizationId, input.businessUnitId);
      await assertCategory(
        actor.organizationId,
        MODULE_KEYS.information,
        input.categoryId
      );
      return information.create(
        actor.organizationId,
        actor.identity.subjectId,
        input
      );
    },

    async listInformation(
      identity: SecurityIdentity | null | undefined,
      query: ListAssetsQuery
    ): Promise<Paginated<InformationAsset>> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      return information.list(actor.organizationId, query);
    },

    async getInformation(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<InformationAsset> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      const asset = await information.findById(actor.organizationId, id);
      if (!asset) throw new NotFoundError("Information asset not found");
      return asset;
    },

    async updateInformation(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateInformationInput
    ): Promise<InformationAsset> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const existing = await information.findById(actor.organizationId, id);
      if (!existing) throw new NotFoundError("Information asset not found");
      if ("businessUnitId" in (input as Record<string, unknown>)) {
        throw new ValidationAppError("Business unit cannot be changed after create");
      }
      if (input.ownerId !== undefined) {
        await assertOwner(actor.organizationId, input.ownerId);
      }
      await assertCategory(
        actor.organizationId,
        MODULE_KEYS.information,
        input.categoryId
      );
      const updated = await information.update(actor.organizationId, id, input);
      if (!updated) throw new NotFoundError("Information asset not found");
      return updated;
    },

    async deleteInformation(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      const existing = await information.findById(actor.organizationId, id);
      if (!existing) throw new NotFoundError("Information asset not found");
      await assertCanDelete(actor.identity, existing.createdBy, id);
      const deleted = await information.softDelete(actor.organizationId, id);
      if (!deleted) {
        throw new ConflictError("Information asset could not be deleted");
      }
    },

    // ── Stats (for Dashboard / Stats consumers) ───────────────
    async getStats(
      identity: SecurityIdentity | null | undefined
    ): Promise<InventoryStats> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");

      const [hw, sw, ppl, pre, info] = await Promise.all([
        hardware.aggregateStats(actor.organizationId),
        software.aggregateStats(actor.organizationId),
        people.aggregateStats(actor.organizationId),
        premise.aggregateStats(actor.organizationId),
        information.aggregateStats(actor.organizationId),
      ]);

      const categories = [
        { category: "hardware" as const, ...hw },
        { category: "software" as const, ...sw },
        { category: "people" as const, ...ppl },
        { category: "premise" as const, ...pre },
        { category: "information" as const, ...info },
      ];

      return {
        categories,
        totalCount: categories.reduce((sum, c) => sum + c.count, 0),
        totalCost: categories.reduce((sum, c) => sum + c.totalCost, 0),
      };
    },
  };
}

export type AssetsService = ReturnType<typeof createAssetsService>;
