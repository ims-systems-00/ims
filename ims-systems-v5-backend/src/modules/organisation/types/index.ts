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

/** Advance offsets before document review date (on-day is always sent). */
export const DOCUMENT_REVIEW_REMINDER_OFFSETS = [
  "3_months",
  "2_months",
  "1_month",
  "3_weeks",
  "2_weeks",
  "1_week",
  "5_days",
  "1_day",
] as const;

export type DocumentReviewReminderOffset =
  (typeof DOCUMENT_REVIEW_REMINDER_OFFSETS)[number];

export type OrganisationLicenceCounter = {
  allocated: number;
  used: number;
};

export type OrganisationLicences = {
  superUser: { allocated: number; used: number };
  users: { allocated: number; used: number };
  groups: { allocated: number; used: number };
  /** Toolkit display names selected at Go Live (compliance provision uses these). */
  complianceTools: string[];
  additionalModules: string[];
  carbocalc: boolean;
  imsforms: boolean;
  projectims: boolean;
};

export const ORGANISATION_PAYMENT_TYPES = ["Card", "Monthly invoice"] as const;
export type OrganisationPaymentType =
  (typeof ORGANISATION_PAYMENT_TYPES)[number];

export const ORGANISATION_PAYMENT_STATUSES = [
  "Trial",
  "Subscribed",
  "Unsubscribed",
] as const;
export type OrganisationPaymentStatus =
  (typeof ORGANISATION_PAYMENT_STATUSES)[number];

export type OrganisationPaymentSystem = {
  type: OrganisationPaymentType | null;
  status: OrganisationPaymentStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

export type OrganisationSystemDate = {
  start: Date | null;
  end: Date | null;
  /** True until Go Live (or until an admin explicitly sets dates). */
  unset: boolean;
};

export type Organisation = {
  id: string;
  reference: string;
  name: string;
  industry: string;
  sizeOfOrganisation: number;
  officeEmail: string;
  /** Reply-to for CRM email campaigns; optional. */
  campaignEmail?: string;
  contactNumber: string;
  companyNumber: string;
  vatNumber: string;
  address: OrganisationAddress;
  country: OrganisationCountry;
  isCustomer: boolean;
  isPartner: boolean;
  status: OrganisationStatus;
  licences: OrganisationLicences;
  paymentSystem: OrganisationPaymentSystem;
  systemDate: OrganisationSystemDate;
  documentReviewReminderOffsets: DocumentReviewReminderOffset[];
  referralSource: string | null;
  logoSrc: string | null;
  /** File Handler location for the logo, so clients can mint fresh view URLs. */
  logoStorage: OrganisationLogoStorage | null;
  /**
   * Auth0 Organization id (`org_…`). Optional until linked (auth rollout M2+).
   * Canonical tenant key remains `id` (IMS ObjectId / organizationId).
   */
  auth0OrganizationId: string | null;
  createdBy: string;
  createdOn: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type RequestOrganisationLicenceInput = {
  superUser?: number;
  users?: number;
  groups?: number;
  complianceTools?: string[];
  additionalModules?: string[];
  message?: string;
};

export type UpdateDocumentReviewRemindersInput = {
  documentReviewReminderOffsets: DocumentReviewReminderOffset[];
};

export type OrganisationLogoStorage = {
  bucket: string;
  key: string;
  fileName?: string;
};

export type UpdateOrganisationLogoInput = {
  logoSrc: string | null;
  logoStorage?: OrganisationLogoStorage | null;
};

export type OrganisationMembership = {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganisationRole;
  jobTitle: string;
  /** Compliance toolkit names granted to this member (U-07/N-10). */
  complianceToolkits: string[];
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
  /** Optional public logo URL from file upload (wizard step). */
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

export type OrganisationProfile = Organisation & {
  membership: OrganisationMembership | null;
};
