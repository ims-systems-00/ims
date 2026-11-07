/**
 * Go Live side effect (N-09 remainder): create the organisation's
 * Auth0 Organization and link it (`auth0OrganizationId`) so Auth0
 * `org_id` token claims resolve to this organisation at login.
 * Best-effort and idempotent by default: skips when already linked or
 * when an Auth0 Organization with the derived name already exists.
 * Callers that need a hard failure (navbar ensure-auth0-link) pass
 * `failSoft: false`.
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
  /** Database connection name to enable on new Auth0 Orgs (login). */
  dbConnectionName?: string;
}): OrganisationGoLiveSideEffectsPort {
  const organisations = deps.organisations ?? createOrganisationRepository();
  const base: OrganisationGoLiveSideEffectsPort = {
    async provisionComplianceToolkits() {},
    async createCardCheckoutSession() {
      return null;
    },
    async notifyGoLive() {},
    async ensureAuth0Organisation({
      organizationId,
      failSoft = true,
      auth0UserId,
    }) {
      try {
        const org = await organisations.findById(organizationId);
        if (!org) return;

        let auth0OrgId = org.auth0OrganizationId?.trim() || null;
        if (!auth0OrgId) {
          const name = toAuth0OrgName(org.id, org.name);
          const existing = await deps.mgmt.getOrganizationByName(name);
          const created =
            existing ??
            (await deps.mgmt.createOrganization({
              name,
              displayName: org.name,
            }));
          auth0OrgId = created.id;
          await organisations.linkAuth0OrganizationId(org.id, auth0OrgId);

          const connectionName = deps.dbConnectionName?.trim();
          if (connectionName) {
            const connectionId =
              await deps.mgmt.getConnectionIdByName(connectionName);
            if (connectionId) {
              await deps.mgmt.enableOrganizationConnection({
                organizationId: auth0OrgId,
                connectionId,
              });
            } else {
              deps.logger?.warn(
                { organizationId, connectionName },
                "N-09: Auth0 DB connection not found; org login may fail until enabled in Dashboard",
              );
            }
          }
        }

        if (auth0UserId?.trim()) {
          await deps.mgmt.addOrganizationMembers(auth0OrgId, [auth0UserId]);
        }
      } catch (error) {
        deps.logger?.warn(
          {
            organizationId,
            err: error instanceof Error ? error.message : String(error),
          },
          "N-09: Auth0 Organization provisioning failed (Go Live continues)",
        );
        if (!failSoft) {
          throw error;
        }
      }
    },
  };
  return base;
}
