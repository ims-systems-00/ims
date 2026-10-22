/**
 * Go Live side effect (N-09 remainder): create the organisation's
 * Auth0 Organization and link it (`auth0OrganizationId`) so Auth0
 * `org_id` token claims resolve to this organisation at login.
 * Best-effort and idempotent: skips when already linked or when an
 * Auth0 Organization with the derived name already exists.
 */

import type { Logger } from "../../../infrastructure/logging/logger";
import type { Auth0ManagementApi } from "../../../security/auth0/auth0-management-api";
import { createOrganisationRepository } from "../repositories/organisation.repository";
import type { OrganisationGoLiveSideEffectsPort } from "../ports";

/** Auth0 organization names: lowercase alphanumerics and hyphens. */
export const toAuth0OrgName = (organisationId: string, orgName: string): string => {
  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug ? `${slug}-${organisationId.slice(-6)}` : `org-${organisationId}`;
};

export function createAuth0OrganisationSideEffectsAdapter(deps: {
  mgmt: Auth0ManagementApi;
  logger?: Logger;
  organisations?: ReturnType<typeof createOrganisationRepository>;
}): OrganisationGoLiveSideEffectsPort {
  const organisations = deps.organisations ?? createOrganisationRepository();
  const base: OrganisationGoLiveSideEffectsPort = {
    async provisionComplianceToolkits() {},
    async createCardCheckoutSession() {
      return null;
    },
    async notifyGoLive() {},
    async ensureAuth0Organisation({ organizationId }) {
      try {
        const org = await organisations.findById(organizationId);
        if (!org || org.auth0OrganizationId) return;
        const name = toAuth0OrgName(org.id, org.name);
        const existing = await deps.mgmt.getOrganizationByName(name);
        const created =
          existing ?? (await deps.mgmt.createOrganization({ name, displayName: org.name }));
        await organisations.linkAuth0OrganizationId(org.id, created.id);
      } catch (error) {
        deps.logger?.warn(
          {
            organizationId,
            err: error instanceof Error ? error.message : String(error),
          },
          "N-09: Auth0 Organization provisioning failed (Go Live continues)",
        );
      }
    },
  };
  return base;
}
