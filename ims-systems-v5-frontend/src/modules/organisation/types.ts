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

export type IncidentResolutionTargets = Record<
  "P1" | "P2" | "P3" | "P4",
  number | null
>;

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

/** Stripe Checkout or Billing Portal redirect URL. */
export type OrganisationPaymentSession = {
  url: string;
};

export type LicenceRequestStatus = "Pending" | "Granted" | "Cancelled";

/** Licence Request record (LR- reference), org-side history. */
export type LicenceRequest = {
  id: string;
  reference: string;
  organizationId: string;
  requestedBy: string;
  superUser: number;
  users: number;
  groups: number;
  complianceTools: string[];
  additionalModules: string[];
  message: string;
  status: LicenceRequestStatus;
  grantedBy: string | null;
  grantedOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateLicenceRequestResult = {
  request: LicenceRequest;
  organisation: OrganisationProfile;
};

export type PaginatedLicenceRequests = {
  items: LicenceRequest[];
  total: number;
  page: number;
  pageSize: number;
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
  documentReviewReminderOffsets?: DocumentReviewReminderOffset[];
  referralSource: string | null;
  logoSrc: string | null;
  /** File Handler location for the logo (fresh view URLs). */
  incidentResolutionTargets?: IncidentResolutionTargets;
  logoStorage?: {
    bucket: string;
    key: string;
    fileName?: string;
  } | null;
  /**
   * When enabled, org-scoped emails use the organisation logo + theme colors.
   * When disabled/absent, emails use iMS Systems branding.
   */
  emailBranding?: OrganisationEmailBranding;
  /** Auth0 Organization id when linked; null until auth rollout links it. */
  auth0OrganizationId?: string | null;
  createdBy: string;
  createdOn: string;
  createdAt: string;
  updatedAt: string;
};

export type OrganisationEmailBrandColors = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryExtraLight: string;
};

export type OrganisationEmailBranding = {
  enabled: boolean;
  themeId: string | null;
  colors: OrganisationEmailBrandColors | null;
};

export type UpdateOrganisationEmailBrandingInput = {
  enabled: boolean;
  themeId?: string | null;
  colors?: OrganisationEmailBrandColors | null;
};

export type EmailBrandingPreviewTemplateId =
  | "invitation"
  | "document-shared"
  | "campaign-wrap";

export type PreviewOrganisationEmailBrandingInput = {
  templateId: EmailBrandingPreviewTemplateId;
  enabled: boolean;
  themeId?: string | null;
  colors?: OrganisationEmailBrandColors | null;
  logoUrl?: string | null;
};

export type EmailBrandingPreviewResult = {
  templateId: EmailBrandingPreviewTemplateId;
  subject: string;
  html: string;
};

export type ComposeOrganisationMailAttachment = {
  filename: string;
  contentBase64: string;
  type?: string;
};

export type ComposeOrganisationMailInput = {
  subject: string;
  body: string;
  recipientUserIds: string[];
  attachments?: ComposeOrganisationMailAttachment[];
};

export type ComposeOrganisationMailResult = {
  accepted: boolean;
  recipientCount: number;
  emailed: boolean;
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
/** Same industry list as V4 onboarding (`ims-systems-frontend/.../industries.js`). */
export const ORGANISATION_INDUSTRIES = [
  "Accounting",
  "Airlines/Aviation",
  "Alternative Dispute Resolution",
  "Alternative Medicine",
  "Animation",
  "Apparel & Fashion",
  "Architecture & Planning",
  "Arts & Crafts",
  "Automotive",
  "Aviation & Aerospace",
  "Banking",
  "Biotechnology",
  "Broadcast Media",
  "Building Materials",
  "Business Supplies & Equipment",
  "Capital Markets",
  "Chemicals",
  "Civic & Social Organization",
  "Civil Engineering",
  "Commercial Real Estate",
  "Computer & Network Security",
  "Computer Games",
  "Computer Hardware",
  "Computer Networking",
  "Computer Software",
  "Construction",
  "Consultancy",
  "Consumer Electronics",
  "Consumer Goods",
  "Consumer Services",
  "Cosmetics",
  "Dairy",
  "Defense & Space",
  "Design",
  "Education Management",
  "E-learning",
  "Electrical & Electronic Manufacturing",
  "Engineering",
  "Entertainment",
  "Environmental Services",
  "Events Services",
  "Executive Office",
  "Facilities Services",
  "Farming",
  "Financial Services",
  "Fine Art",
  "Fishery",
  "Food & Beverages",
  "Food Production",
  "Fundraising",
  "Furniture",
  "Gambling & Casinos",
  "Glass, Ceramics & Concrete",
  "Government Administration",
  "Government Relations",
  "Graphic Design",
  "Health, Wellness & Fitness",
  "Higher Education",
  "Hospital & Health Care",
  "Hospitality",
  "Human Resources",
  "Import & Export",
  "Individual & Family Services",
  "Industrial Automation",
  "Information Services",
  "Information Technology & Services",
  "Insurance",
  "International Affairs",
  "International Trade & Development",
  "Internet",
  "Investment Banking/Venture",
  "Investment Management",
  "Judiciary",
  "Law Enforcement",
  "Law Practice",
  "Legal Services",
  "Legislative Office",
  "Leisure & Travel",
  "Libraries",
  "Logistics & Supply Chain",
  "Luxury Goods & Jewelry",
  "Machinery",
  "Maintenance",
  "Management Consulting",
  "Maritime",
  "Marketing & Advertising",
  "Market Research",
  "Mechanical or Industrial Engineering",
  "Media Production",
  "Medical Device",
  "Medical Practice",
  "Mental Health Care",
  "Military",
  "Mining & Metals",
  "Motion Pictures & Film",
  "Museums & Institutions",
  "Music",
  "Nanotechnology",
  "Newspapers",
  "Nonprofit Organization Management",
  "Oil & Energy",
  "Online Publishing",
  "Outsourcing/Offshoring",
  "Package/Freight Delivery",
  "Packaging & Containers",
  "Paper & Forest Products",
  "Performing Arts",
  "Pharmaceuticals",
  "Philanthropy",
  "Photography",
  "Plastics",
  "Political Organization",
  "Primary/Secondary",
  "Printing",
  "Professional Training",
  "Program Development",
  "Public Policy",
  "Public Relations",
  "Public Safety",
  "Publishing",
  "Railroad Manufacture",
  "Ranching",
  "Real Estate",
  "Recreational",
  "Refurbishment",
  "Facilities & Services",
  "Religious Institutions",
  "Renewables & Environment",
  "Research",
  "Restaurants",
  "Retail",
  "Security & Investigations",
  "Semiconductors",
  "Shipbuilding",
  "Sporting Goods",
  "Sports",
  "Staffing & Recruiting",
  "Supermarkets",
  "Telecommunications",
  "Textiles",
  "Think Tanks",
  "Tobacco",
  "Translation & Localization",
  "Transportation/Trucking/Railroad",
  "Utilities",
  "Venture Capital",
  "Veterinary",
  "Warehousing",
  "Wholesale",
  "Wine & Spirits",
  "Wireless",
  "Writing & Editing",
] as const;
