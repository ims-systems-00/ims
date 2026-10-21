/**
 * Partnership Programme (V4 parity).
 * Spec: docs/module-specifications/partnership-program.md
 *
 * A partnership enrols a user + their organisation as an iMS referral
 * partner. Applications are auto-accepted (status "iMS Accepted",
 * organisation isPartner = true). The partner code is the record id;
 * referred organisations store it as referralSource.
 */

export const PARTNERSHIP_STATUSES = ["Pending", "iMS Accepted"] as const;

export type PartnershipStatus = (typeof PARTNERSHIP_STATUSES)[number];

export type Partnership = {
  id: string;
  userId: string;
  organizationId: string;
  serviceProvision: string;
  customerReach: number;
  website: string;
  standards: string;
  description: string;
  status: PartnershipStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type ApplyPartnershipInput = {
  serviceProvision: string;
  customerReach: number;
  website: string;
  standards: string;
  description: string;
};

export type ReferredOrganisationSummary = {
  id: string;
  name: string;
  createdAt: Date;
  isCustomer: boolean;
  superUser: { allocated: number; used: number };
  users: { allocated: number; used: number };
  groups: { allocated: number; used: number };
  complianceTools: string[];
  additionalModules: string[];
};

export type PartnershipDashboard = {
  partnership: Partnership;
  /** Partner code shared with referred customers (= partnership id). */
  partnerCode: string;
  /** Signup link embedding the partner code. */
  signupUrl: string;
  stats: {
    organisations: number;
    groups: number;
    users: number;
    superUsers: number;
    crmModules: number;
  };
  complianceBreakdown: Array<{ toolkit: string; count: number }>;
  organisations: ReferredOrganisationSummary[];
};
