/**
 * Real CrmLicencePort — org.licences.additionalModules (auth0-openfga).
 * SoT: docs/security/LICENCE_SOURCE_OF_TRUTH.md
 */

import { createOrganisationRepository } from "../../organisation/repositories/organisation.repository";
import type { CrmLicencePort } from "../ports";

/**
 * CRM is licensed when the organisation's additionalModules contains "CRM".
 */
export function createOrganisationCrmLicenceAdapter(): CrmLicencePort {
  const organisations = createOrganisationRepository();

  return {
    async isCrmLicensed(organizationId: string): Promise<boolean> {
      const org = await organisations.findById(organizationId);
      if (!org) return false;
      return (org.licences.additionalModules ?? []).includes("CRM");
    },
  };
}
