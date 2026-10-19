/**
 * Real ComplianceLicencePort — org.licences.complianceTools (auth0-openfga).
 * SoT: docs/security/LICENCE_SOURCE_OF_TRUTH.md
 */

import { createOrganisationRepository } from "../../organisation/repositories/organisation.repository";
import type { ComplianceLicencePort } from "../ports";
import {
  isComplianceToolkitName,
  type ComplianceToolkitName,
} from "../types";

function licensedFromOrg(
  complianceTools: string[] | undefined
): ComplianceToolkitName[] {
  const seen = new Set<ComplianceToolkitName>();
  const result: ComplianceToolkitName[] = [];
  for (const raw of complianceTools ?? []) {
    const name = raw.trim();
    if (!isComplianceToolkitName(name) || seen.has(name)) continue;
    seen.add(name);
    result.push(name);
  }
  return result;
}

/**
 * Reads organisation.licences.complianceTools; unknown catalogue names ignored.
 */
export function createOrganisationComplianceLicenceAdapter(): ComplianceLicencePort {
  const organisations = createOrganisationRepository();

  async function listLicensedToolkits(
    organizationId: string
  ): Promise<ComplianceToolkitName[]> {
    const org = await organisations.findById(organizationId);
    if (!org) return [];
    return licensedFromOrg(org.licences.complianceTools);
  }

  return {
    listLicensedToolkits,
    async isToolkitLicensed(organizationId, name) {
      const licensed = await listLicensedToolkits(organizationId);
      return licensed.includes(name);
    },
  };
}
