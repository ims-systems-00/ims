/**
 * Cross-module ports for the Partnership Programme.
 * Spec: docs/module-specifications/partnership-program.md
 */

import type { Organisation } from "../organisation/types";

/** Organisation reads/writes the partnerships module needs. */
export type PartnershipOrganisationPort = {
  findById(id: string): Promise<Organisation | null>;
  markAsPartner(id: string): Promise<Organisation | null>;
  listByReferralSource(referralSource: string): Promise<Organisation[]>;
};

/** Membership check for applicants (must belong to the org they enrol). */
export type PartnershipMembershipPort = {
  isMember(userId: string, organizationId: string): Promise<boolean>;
};
