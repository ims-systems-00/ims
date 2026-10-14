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
  superUser: OrganisationLicenceCounter;
  users: OrganisationLicenceCounter;
  groups: OrganisationLicenceCounter;
  /** Licensed compliance toolkit names (e.g. ISO 9001). */
  complianceTools: string[];
  /** Licensed add-on modules (e.g. CRM). */
  additionalModules: string[];
};

export type RequestOrganisationLicenceInput = {
  superUser?: number;
  users?: number;
  groups?: number;
  complianceTools?: string[];
  additionalModules?: string[];
  message?: string;
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
  /** Selected advance reminder offsets (in addition to always-on review day). */
  documentReviewReminderOffsets: DocumentReviewReminderOffset[];
  referralSource: string | null;
  logoSrc: string | null;
  createdBy: string;
  createdOn: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type UpdateDocumentReviewRemindersInput = {
  documentReviewReminderOffsets: DocumentReviewReminderOffset[];
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
