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
  complianceTools?: string[];
  additionalModules?: string[];
  carbocalc?: boolean;
  imsforms?: boolean;
  projectims?: boolean;
};

export type OrganisationPaymentType = "Card" | "Monthly invoice";

export type OrganisationPaymentStatus =
  | "Trial"
  | "Subscribed"
  | "Unsubscribed";

export type OrganisationPaymentSystem = {
  type: OrganisationPaymentType | null;
  status: OrganisationPaymentStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

export type OrganisationSystemDate = {
  start: string | null;
  end: string | null;
  unset: boolean;
};

export const ADDITIONAL_MODULE_OPTIONS = ["CRM"] as const;

export const DOCUMENT_REVIEW_REMINDER_OPTIONS = [
  { value: "3_months", label: "3 Months" },
  { value: "2_months", label: "2 Months" },
  { value: "1_month", label: "1 Month" },
  { value: "3_weeks", label: "3 Weeks" },
  { value: "2_weeks", label: "2 Weeks" },
  { value: "1_week", label: "1 Week" },
  { value: "5_days", label: "5 Days" },
  { value: "1_day", label: "1 Day" },
] as const;

export type DocumentReviewReminderOffset =
  (typeof DOCUMENT_REVIEW_REMINDER_OPTIONS)[number]["value"];

export type RequestOrganisationLicenceInput = {
  superUser?: number;
  users?: number;
  groups?: number;
  complianceTools?: string[];
  additionalModules?: string[];
  message?: string;
};

export function normalizeOrganisationLicences(
  licences: Partial<OrganisationLicences> | null | undefined
): OrganisationLicences {
  return {
    superUser: {
      allocated: licences?.superUser?.allocated ?? 0,
      used: licences?.superUser?.used ?? 0,
    },
    users: {
      allocated: licences?.users?.allocated ?? 0,
      used: licences?.users?.used ?? 0,
    },
    groups: {
      allocated: licences?.groups?.allocated ?? 0,
      used: licences?.groups?.used ?? 0,
    },
    complianceTools: [...(licences?.complianceTools ?? [])],
    additionalModules: [...(licences?.additionalModules ?? [])],
  };
}

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
  paymentSystem?: OrganisationPaymentSystem;
  systemDate?: OrganisationSystemDate;
  referralSource: string | null;
  logoSrc: string | null;
  /** Auth0 Organization id when linked; null until auth rollout links it. */
  auth0OrganizationId?: string | null;
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
  logoSrc?: string | null;
};

export type CreateOrganisationResult = {
  organisation: Organisation;
  membership: OrganisationMembership;
};

export type GoLiveOrganisationInput = {
  paymentType: OrganisationPaymentType;
  superUser: number;
  users: number;
  groups: number;
  complianceTools?: string[];
  additionalModules?: string[];
  carbocalc?: boolean;
  imsforms?: boolean;
  projectims?: boolean;
};

export type GoLiveOrganisationResult = {
  organisation: Organisation;
  paymentSession: { url: string } | null;
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
