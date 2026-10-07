/**
 * Document Management frontend types.
 * Spec: docs/module-specifications/document-management.md
 */

export const DOCUMENT_PRIVACY_VALUES = [
  "Organisational",
  "Business unit",
  "Only me",
  "Custom",
] as const;
export type DocumentPrivacy = (typeof DOCUMENT_PRIVACY_VALUES)[number];

export const DOCUMENT_REVIEW_INTERVALS = [
  "Yearly",
  "Half yearly",
  "Quarterly",
] as const;
export type DocumentReviewInterval = (typeof DOCUMENT_REVIEW_INTERVALS)[number];

export const DOCUMENT_PURPOSES = [
  "Process",
  "Standard operating procedure",
  "Policy",
  "Document",
  "Legal",
  "Miscellaneous",
] as const;
export type DocumentPurpose = (typeof DOCUMENT_PURPOSES)[number];

export const DOCUMENT_PURPOSE_LABELS: Record<DocumentPurpose, string> = {
  Process: "Processes",
  "Standard operating procedure": "SOPs",
  Policy: "Policies",
  Document: "Documents",
  Legal: "Legal",
  Miscellaneous: "Miscellaneous",
};

export const DOCUMENT_APPLICABLE_MODULES = [
  "risks",
  "cips",
  "audits",
  "compliancecontrols",
  "managementreviews",
  "suppliers",
  "incidents",
  "expensereports",
] as const;
export type DocumentApplicableModule =
  (typeof DOCUMENT_APPLICABLE_MODULES)[number];

export const DOCUMENT_APPLICABLE_MODULE_LABELS: Record<
  DocumentApplicableModule,
  string
> = {
  risks: "Risks",
  cips: "OFI",
  audits: "Audits",
  compliancecontrols: "Compliance",
  managementreviews: "Management reviews",
  suppliers: "Suppliers",
  incidents: "Incidents",
  expensereports: "Expense reports",
};

export type DocumentFileMeta = {
  Name: string;
  Key: string;
  key: string;
  Bucket: string;
};

export type AuthorisationEntry = {
  id: string;
  userId: string;
  status: "Pending" | "Approved" | "Rejected";
  handledOn: string | null;
  message: string;
};

export type DocumentRepository = {
  id: string;
  organizationId: string;
  reference: string;
  name: string;
  description: string;
  privacy: DocumentPrivacy;
  businessUnitId: string | null;
  owners: string[];
  sharedWith: string[];
  reviewInterval: DocumentReviewInterval;
  createdBy: string;
  createdOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentTreeNode = {
  id: string;
  organizationId: string;
  repositoryId: string;
  reference: string;
  name: string;
  type: "folder" | "document";
  status: "Pending" | "Published" | "Rejected" | "Archived";
  parentNodeId: string | null;
  documentData: {
    storageInfo: DocumentFileMeta;
    purpose: DocumentPurpose;
    owners: string[];
    applicableModules: DocumentApplicableModule[];
    complianceTools: string[];
    authorisation: AuthorisationEntry[];
    classification: string;
    dvID: number;
    conformance: number;
    threadId: string;
    reviewDate: string | null;
  } | null;
  folderData: {
    reviewDate: string | null;
    modifiedBy: string | null;
    modifiedOn: string | null;
  } | null;
  createdBy: string;
  createdOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentOverviewCounts = {
  total: number;
  byPurpose: Record<DocumentPurpose, number>;
};

export type PaginatedDocumentRepositories = {
  items: DocumentRepository[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedDocumentNodes = {
  items: DocumentTreeNode[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CreateDocumentRepositoryInput = {
  name: string;
  description?: string;
  privacy: DocumentPrivacy;
  businessUnitId?: string | null;
  owners: string[];
  sharedWith?: string[];
  reviewInterval?: DocumentReviewInterval;
  copyFolderStructureFromId?: string;
};

export type UpdateDocumentRepositoryInput = {
  name?: string;
  description?: string | null;
  privacy?: DocumentPrivacy;
  businessUnitId?: string | null;
  owners?: string[];
  sharedWith?: string[];
  reviewInterval?: DocumentReviewInterval;
};

export type CreateFileNodesResult = {
  created: DocumentTreeNode[];
  skipped: string[];
};

export type ListRepositoriesParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  privacy?: DocumentPrivacy;
  deleted?: boolean;
  sort?: "createdOn" | "name" | "updatedAt";
  sortDir?: "asc" | "desc";
};

export type ListRepoNodesParams = {
  page?: number;
  pageSize?: number;
  parentNodeId?: string | null;
  search?: string;
  deleted?: boolean;
  type?: "folder" | "document";
  status?: DocumentTreeNode["status"];
  sort?: "createdOn" | "name" | "updatedAt";
  sortDir?: "asc" | "desc";
};

export type DocumentsTabId = "overview" | "repositories" | "recycle";
