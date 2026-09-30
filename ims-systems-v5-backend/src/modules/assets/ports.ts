/**
 * Cross-module ports for Assets (Inventory).
 * Real Users / Business Units / Tags modules replace stub adapters later.
 */

export interface UserLookupPort {
  /**
   * Returns true when the user exists in the organisation and may own assets.
   */
  existsInOrganization(
    organizationId: string,
    userId: string
  ): Promise<boolean>;
}

/** Development adapter — accepts any non-empty user id until Users module exists. */
export class AcceptAnyUserAdapter implements UserLookupPort {
  async existsInOrganization(
    _organizationId: string,
    userId: string
  ): Promise<boolean> {
    return userId.trim().length > 0;
  }
}

export interface BusinessUnitLookupPort {
  existsInOrganization(
    organizationId: string,
    businessUnitId: string
  ): Promise<boolean>;
}

/** Development adapter — accepts any non-empty business unit id. */
export class AcceptAnyBusinessUnitAdapter implements BusinessUnitLookupPort {
  async existsInOrganization(
    _organizationId: string,
    businessUnitId: string
  ): Promise<boolean> {
    return businessUnitId.trim().length > 0;
  }
}

export interface CategoryLookupPort {
  /**
   * Validates a tags/categories id for the given asset module key
   * (e.g. hardwareassets, softwareassets).
   */
  existsForAssetModule(
    organizationId: string,
    moduleKey: string,
    categoryId: string
  ): Promise<boolean>;
}

/** Development adapter — accepts any non-empty category id. */
export class AcceptAnyCategoryAdapter implements CategoryLookupPort {
  async existsForAssetModule(
    _organizationId: string,
    _moduleKey: string,
    categoryId: string
  ): Promise<boolean> {
    return categoryId.trim().length > 0;
  }
}
