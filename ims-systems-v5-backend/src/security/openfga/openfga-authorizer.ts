/**
 * OpenFGA Authorizer adapter (auth rollout M7).
 * Org-level AuthZ for all enforced module resource types. Fail closed on errors.
 */

import { ORGANISATION_RESOURCE } from "../../modules/organisation/types";
import type { AuthorizationCheck, Authorizer } from "../authorizer";
import { ENFORCED_RESOURCE_TYPES } from "./enforced-resources";
import {
  organisationActionToRelation,
  organizationObject,
  userObject,
} from "./role-mapping";
import type { OpenFgaGateway } from "./types";

export type OpenFgaAuthorizerDeps = {
  gateway: OpenFgaGateway;
  /**
   * Resource types enforced by OpenFGA.
   * Defaults to the full M7 set.
   */
  enforcedResourceTypes?: ReadonlySet<string>;
};

/**
 * Authorizes checks against OpenFGA using organization-level relations.
 *
 * Organisation bootstrap (`create` / `read` without organizationId) allows any
 * authenticated caller — Mongo membership still scopes list/create outcomes.
 */
export class OpenFgaAuthorizer implements Authorizer {
  private readonly gateway: OpenFgaGateway;
  private readonly enforced: ReadonlySet<string>;

  constructor(deps: OpenFgaAuthorizerDeps) {
    this.gateway = deps.gateway;
    this.enforced = deps.enforcedResourceTypes ?? ENFORCED_RESOURCE_TYPES;
  }

  async allow(check: AuthorizationCheck): Promise<boolean> {
    if (!this.enforced.has(check.resourceType)) {
      return false;
    }

    if (!check.identity.subjectId) {
      return false;
    }

    const organizationId = check.organizationId?.trim();

    // Organisation bootstrap / list-without-tenant: AuthN is enough.
    if (!organizationId) {
      if (
        check.resourceType === ORGANISATION_RESOURCE &&
        (check.action === "create" || check.action === "read")
      ) {
        return true;
      }
      return false;
    }

    const relation = organisationActionToRelation(check.action);
    if (!relation) {
      return false;
    }

    try {
      return await this.gateway.check({
        user: userObject(check.identity.subjectId),
        relation,
        object: organizationObject(organizationId),
      });
    } catch {
      // Fail closed.
      return false;
    }
  }
}
