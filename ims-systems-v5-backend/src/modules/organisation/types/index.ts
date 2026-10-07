export const ORGANISATION_RESOURCE = "organisation";

export const ORGANISATION_STATUSES = ["Running", "Paused"] as const;
export type OrganisationStatus = (typeof ORGANISATION_STATUSES)[number];

export const ORGANISATION_ROLES = [
  "Super Admin",
  "Head of Service",
  "Basic",
  "Auditor",
] as const;
export type OrganisationRole = (typeof ORGANISATION_ROLES)[number];

export type OrganisationCountry = {
  name: string;
  code: string;
  currency: string;
  phoneCode: number;
};

export type OrganisationAddress = {
  line1: string;
  line2: string;
  city: string;
  county: string;
  postCode: string;
  country: string;
};

export type OrganisationLicences = {
  superUser: { allocated: number; used: number };
  users: { allocated: number; used: number };
  groups: { allocated: number; used: number };
};

export type Organisation = {
  id: string;
  reference: string;
  name: string;
  industry: string;
  sizeOfOrganisation: number;
  officeEmail: string;
  contactNumber: string;
  companyNumber: string;
  vatNumber: string;
  address: OrganisationAddress;
  country: OrganisationCountry;
  isCustomer: boolean;
  isPartner: boolean;
  status: OrganisationStatus;
  licences: OrganisationLicences;
  referralSource: string | null;
  logoSrc: string | null;
  createdBy: string;
  createdOn: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type OrganisationMembership = {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganisationRole;
  jobTitle: string;
  createdOn: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateOrganisationInput = {
  name: string;
  industry: string;
  sizeOfOrganisation: number;
  officeEmail: string;
  contactNumber: string;
  companyNumber?: string;
  vatNumber?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    county: string;
    postCode: string;
  };
  country: {
    name: string;
    code: string;
    currency: string;
    phoneCode: number;
  };
  referralSource?: string | null;
};

export type CreateOrganisationResult = {
  organisation: Organisation;
  membership: OrganisationMembership;
};

export type OrganisationProfile = Organisation & {
  membership: OrganisationMembership | null;
};
