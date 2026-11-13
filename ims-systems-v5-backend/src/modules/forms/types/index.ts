/**
 * IMS Forms domain types.
 */

export const FORMS_RESOURCE = "forms";

export const FORM_STATUSES = ["draft", "published", "archived"] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];

export const FORM_ELEMENT_TYPES = [
  "Header",
  "Divider",
  "Alert",
  "RichContent",
  "Cover",
  "Conclusion",
  "TextInput",
  "LongText",
  "FullName",
  "Email",
  "PhoneNumber",
  "Address",
  "RadioSingleChoice",
  "CheckBoxMultipleChoice",
  "DropDown",
  "DateInput",
  "Location",
  "Consent",
  "FileDropzone",
  "Table",
  "NC_OFI",
] as const;
export type FormElementType = (typeof FORM_ELEMENT_TYPES)[number];

export type FormThemeImage = {
  src: string;
  storage?: {
    bucket: string;
    key: string;
    fileName?: string;
  } | null;
};

export const FORM_LOGO_VERTICAL = ["top", "bottom"] as const;
export type FormLogoVertical = (typeof FORM_LOGO_VERTICAL)[number];

export const FORM_LOGO_HORIZONTAL = ["left", "center", "right"] as const;
export type FormLogoHorizontal = (typeof FORM_LOGO_HORIZONTAL)[number];

export type FormTheme = {
  foregroundColor: string;
  backgroundColor: string;
  accentColor: string;
  logo?: FormThemeImage | null;
  coverImage?: FormThemeImage | null;
  logoVertical?: FormLogoVertical;
  logoHorizontal?: FormLogoHorizontal;
};

export type Form = {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  status: FormStatus;
  theme: FormTheme;
  usagesType: string | null;
  availableForStandards: string[];
  createdBy: string;
  submissionCount: number;
  collaboration: string[];
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FormElement = {
  id: string;
  organizationId: string;
  formId: string;
  type: FormElementType | string;
  attributes: Record<string, unknown>;
  previousElementId: string | null;
  nextElementId: string | null;
  parentElementId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FormSubmissionSubmitter = {
  id: string;
  name: string;
  email: string;
};

export type FormSubmission = {
  id: string;
  organizationId: string;
  formId: string;
  submittedBy: string;
  /** Resolved display identity for `submittedBy` when available. */
  submittedByUser?: FormSubmissionSubmitter | null;
  collectionName: string | null;
  collectionDocument: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FormResponse = {
  id: string;
  organizationId: string;
  formId: string;
  formElementId: string;
  formSubmissionId: string;
  responseValue: unknown;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateFormInput = {
  title: string;
  description?: string | null;
  status?: FormStatus;
  theme?: Partial<FormTheme>;
  usagesType?: string | null;
  availableForStandards?: string[];
  collaboration?: string[];
  elements?: Array<{
    type: string;
    attributes?: Record<string, unknown>;
  }>;
};

export type UpdateFormInput = {
  title?: string;
  description?: string | null;
  status?: FormStatus;
  theme?: Partial<FormTheme>;
  usagesType?: string | null;
  availableForStandards?: string[];
  collaboration?: string[];
};

export type ListFormsQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: FormStatus;
  sort: "createdAt" | "updatedAt" | "title" | "submissionCount";
  sortDir: "asc" | "desc";
  includeDeleted?: boolean;
};

export type PaginatedForms = {
  items: Form[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateFormElementInput = {
  type: string;
  attributes?: Record<string, unknown>;
  /** Insert after this element; omit/null = insert at start. */
  afterElementId?: string | null;
  parentElementId?: string | null;
};

export type UpdateFormElementInput = {
  type?: string;
  attributes?: Record<string, unknown>;
  parentElementId?: string | null;
};

export type ReorderFormElementInput = {
  parentElementId?: string | null;
  /** Place after this element; null = move to start. */
  afterElementId: string | null;
};

export type SubmissionResponseInput = {
  formElementId: string;
  responseValue: unknown;
};

export type CreateFormSubmissionInput = {
  responses: SubmissionResponseInput[];
  collectionName?: string | null;
  collectionDocument?: string | null;
};

export type UpdateFormSubmissionInput = {
  responses?: SubmissionResponseInput[];
  collectionName?: string | null;
  collectionDocument?: string | null;
};

export type ListSubmissionsQuery = {
  page: number;
  pageSize: number;
  sortDir: "asc" | "desc";
};

export type PaginatedSubmissions = {
  items: FormSubmission[];
  total: number;
  page: number;
  pageSize: number;
};

export type FormSubmissionDetail = FormSubmission & {
  responses: Array<
    FormResponse & {
      element?: Pick<FormElement, "id" | "type" | "attributes"> | null;
    }
  >;
};
