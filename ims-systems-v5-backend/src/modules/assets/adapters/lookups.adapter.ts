/**
 * Real Assets lookup adapters (A-01) — org-scoped existence checks
 * backed by Organisation memberships, Functional Units, and
 * Tags & Categories. Wired in auth0-openfga mode; development-stub
 * keeps the AcceptAny adapters so local/demo flows stay frictionless.
 */

import { createFunctionalUnitRepository } from "../../functional-units/repositories/functional-unit.repository";
import { createOrganisationMembershipRepository } from "../../organisation/repositories/organisation-membership.repository";
import { createTagAndCategoryRepository } from "../../tags-and-categories/repositories/tag-and-category.repository";
import type {
  BusinessUnitLookupPort,
  CategoryLookupPort,
  UserLookupPort,
} from "../ports";

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

function isObjectId(value: string): boolean {
  return OBJECT_ID_PATTERN.test(value.trim());
}

/** Owner must be a member of the asset's organisation. */
export function createAssetUserLookupAdapter(): UserLookupPort {
  const memberships = createOrganisationMembershipRepository();
  return {
    async existsInOrganization(organizationId, userId) {
      if (!userId.trim()) return false;
      const membership = await memberships.findByUserAndOrg(
        userId,
        organizationId
      );
      return membership != null;
    },
  };
}

/** Business unit must exist in the asset's organisation. */
export function createAssetBusinessUnitLookupAdapter(): BusinessUnitLookupPort {
  const functionalUnits = createFunctionalUnitRepository();
  return {
    async existsInOrganization(organizationId, businessUnitId) {
      if (!isObjectId(businessUnitId)) return false;
      const unit = await functionalUnits.findById(
        organizationId,
        businessUnitId
      );
      return unit != null;
    },
  };
}

/**
 * Category (tag) must exist in the organisation and, when it declares
 * applicable modules, include this asset module. Tags without module
 * restrictions count as generic categories.
 */
export function createAssetCategoryLookupAdapter(): CategoryLookupPort {
  const tags = createTagAndCategoryRepository();
  return {
    async existsForAssetModule(organizationId, moduleKey, categoryId) {
      if (!isObjectId(categoryId)) return false;
      const tag = await tags.findById(organizationId, categoryId);
      if (!tag) return false;
      if (!tag.applicableModules?.length) return true;
      return (tag.applicableModules as string[]).includes(moduleKey);
    },
  };
}
