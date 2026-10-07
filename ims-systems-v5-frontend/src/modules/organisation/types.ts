export type OrganisationStatus = "Running" | "Paused";

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

export type OrganisationMembership = {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  jobTitle: string;
  createdOn: string;
  createdAt: string;
  updatedAt: string;
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
  createdOn: string;
  createdAt: string;
  updatedAt: string;
};

export type OrganisationProfile = Organisation & {
  membership: OrganisationMembership | null;
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

/** @deprecated Prefer OrganisationProfile from the API. */
export type OrganisationProfileView = {
  id: string;
  reference: string;
  name: string;
  industry: string;
  sizeOfOrganisation: string;
  officeEmail: string;
  contactNumber: string;
  companyNumber: string;
  vatNumber: string;
  address: OrganisationAddress;
  isCustomer: boolean;
  status: OrganisationStatus;
};

export const ORGANISATION_INDUSTRIES = [
  "Information technology",
  "Healthcare",
  "Financial services",
  "Manufacturing",
  "Education",
  "Professional services",
  "Public sector",
  "Other",
] as const;
