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

export type FormTheme = {
  foregroundColor: string;
  backgroundColor: string;
  accentColor: string;
  logo?: FormThemeImage | null;
  coverImage?: FormThemeImage | null;
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
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
};

export type FormSubmission = {
  id: string;
  organizationId: string;
  formId: string;
  submittedBy: string;
  collectionName: string | null;
  collectionDocument: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FormResponse = {
  id: string;
  organizationId: string;
  formId: string;
  formElementId: string;
  formSubmissionId: string;
  responseValue: unknown;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  element?: Pick<FormElement, "id" | "type" | "attributes"> | null;
};

export type FormSubmissionDetail = FormSubmission & {
  responses: FormResponse[];
};

export type PaginatedForms = {
  items: Form[];
  total: number;
  page: number;
  pageSize: number;
};

export type PaginatedSubmissions = {
  items: FormSubmission[];
  total: number;
  page: number;
  pageSize: number;
};

export type ListFormsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: FormStatus;
  sort?: "createdAt" | "updatedAt" | "title" | "submissionCount";
  sortDir?: "asc" | "desc";
  includeDeleted?: boolean;
};

export type CreateFormInput = {
  title: string;
  description?: string | null;
  status?: FormStatus;
  theme?: Partial<FormTheme>;
  elements?: Array<{ type: string; attributes?: Record<string, unknown> }>;
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

export type CreateFormElementInput = {
  type: string;
  attributes?: Record<string, unknown>;
  afterElementId?: string | null;
  parentElementId?: string | null;
};

export type UpdateFormElementInput = {
  type?: string;
  attributes?: Record<string, unknown>;
  parentElementId?: string | null;
};

export type CreateSubmissionInput = {
  responses: Array<{ formElementId: string; responseValue: unknown }>;
  collectionName?: string | null;
  collectionDocument?: string | null;
};
