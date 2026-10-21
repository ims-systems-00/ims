export type PartnershipStatus = "Pending" | "iMS Accepted";

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
  createdAt: string;
  updatedAt: string;
};

export type ApplyPartnershipInput = {
  serviceProvision: string;
  customerReach: number;
  website: string;
  standards: string;
  description: string;
};

export type PartnershipLookup = {
  partnership: Partnership;
  organisationName: string | null;
};

export type ReferredOrganisationSummary = {
  id: string;
  name: string;
  createdAt: string;
  isCustomer: boolean;
  superUser: { allocated: number; used: number };
  users: { allocated: number; used: number };
  groups: { allocated: number; used: number };
  complianceTools: string[];
  additionalModules: string[];
};

export type PartnershipDashboard = {
  partnership: Partnership;
  partnerCode: string;
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
