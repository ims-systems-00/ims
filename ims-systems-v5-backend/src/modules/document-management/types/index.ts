/**
 * Document Management domain types.
 * Spec: docs/module-specifications/document-management.md
 *
 * Foundation slice: repositories, folder/document tree, versioning,
 * authorisation, recycle bin, overview counts, published picker.
 * Signatures / email share / review-reminder cron / queues = later phases.
 */

export const DOCUMENT_MANAGEMENT_RESOURCE = "document-management";

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

export const DOCUMENT_NODE_TYPES = ["folder", "document"] as const;
export type DocumentNodeType = (typeof DOCUMENT_NODE_TYPES)[number];

export const DOCUMENT_STATUSES = [
  "Pending",
  "Published",
  "Rejected",
  "Archived",
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const AUTHORISATION_STATUSES = [
  "Pending",
  "Approved",
  "Rejected",
] as const;
export type AuthorisationStatus = (typeof AUTHORISATION_STATUSES)[number];

/** Applicable modules for the cross-module document picker. */
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

export const DOCUMENT_COMPLIANCE_TOOLS = [
  "DSPTNHS",
  "ISO27001",
  "ISO27001_2022",
  "ISO27001_2022_ANNEX_A",
  "ISO27002",
  "ISO9001",
  "ISO45001",
  "ISO20000",
  "CQC",
  "BS9997",
  "ISO14001",
  "CRM",
  "ISO15686_5",
  "ESG_ENVIRONMENTAL",
  "ESG_GOVERNANCE",
  "ESG_SOCIAL",
] as const;
export type DocumentComplianceTool = (typeof DOCUMENT_COMPLIANCE_TOOLS)[number];

/** File metadata produced by File Handler (Name / Key / Bucket). */
export type DocumentFileMeta = {
  Name: string;
  Key: string;
  key: string;
  Bucket: string;
};

export type AuthorisationEntry = {
  id: string;
  userId: string;
  status: AuthorisationStatus;
  handledOn: Date | null;
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
  createdOn: Date;
  updatedBy: string | null;
  updatedOn: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentTreeNode = {
  id: string;
  organizationId: string;
  repositoryId: string;
  reference: string;
  name: string;
  type: DocumentNodeType;
  status: DocumentStatus;
  parentNodeId: string | null;
  documentData: DocumentNodeData | null;
  folderData: FolderNodeData | null;
  createdBy: string;
  createdOn: Date;
  updatedBy: string | null;
  updatedOn: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentNodeData = {
  storageInfo: DocumentFileMeta;
  purpose: DocumentPurpose;
  owners: string[];
  applicableModules: DocumentApplicableModule[];
  complianceTools: DocumentComplianceTool[];
  authorisation: AuthorisationEntry[];
  classification: string;
  dvID: number;
  conformance: number;
  threadId: string;
  reviewDate: Date | null;
};

export type FolderNodeData = {
  reviewDate: Date | null;
  modifiedBy: string | null;
  modifiedOn: Date | null;
};

export type CreateDocumentRepositoryInput = {
  name: string;
  description?: string;
  privacy: DocumentPrivacy;
  businessUnitId?: string | null;
  owners: string[];
  sharedWith?: string[];
  reviewInterval?: DocumentReviewInterval;
  /** Optional source repository to copy folders from (same org). */
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

export type ListDocumentRepositoriesQuery = {
  page: number;
  pageSize: number;
  search?: string;
  privacy?: DocumentPrivacy;
  /** When true, list soft-deleted repositories (recycle bin). */
  deleted?: boolean;
  sort?: "createdOn" | "name" | "updatedAt";
  sortDir?: "asc" | "desc";
};

export type PaginatedDocumentRepositories = {
  items: DocumentRepository[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CreateFolderNodeInput = {
  name: string;
  parentNodeId?: string | null;
  reviewDate?: string | null;
};

export type CreateFileNodeItemInput = {
  storageInfo: DocumentFileMeta;
  purpose?: DocumentPurpose;
  owners?: string[];
  authorisation?: string[];
  applicableModules?: DocumentApplicableModule[];
  complianceTools?: DocumentComplianceTool[];
  reviewDate?: string | null;
};

export type CreateFileNodesInput = {
  parentNodeId?: string | null;
  data: CreateFileNodeItemInput[];
};

export type CreateFileNodesResult = {
  created: DocumentTreeNode[];
  skipped: string[];
};

export type ListRepoNodesQuery = {
  page: number;
  pageSize: number;
  parentNodeId?: string | null;
  search?: string;
  /** When true, list soft-deleted children (repo recycle bin). */
  deleted?: boolean;
  type?: DocumentNodeType;
  status?: DocumentStatus;
  sort?: "createdOn" | "name" | "updatedAt";
  sortDir?: "asc" | "desc";
};

export type PaginatedDocumentNodes = {
  items: DocumentTreeNode[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type UpdateFolderNodeInput = {
  name?: string;
  reviewDate?: string | null;
};

export type UpdateDocumentNodeInput = {
  purpose?: DocumentPurpose;
  owners?: string[];
  applicableModules?: DocumentApplicableModule[];
  complianceTools?: DocumentComplianceTool[];
  reviewDate?: string | null;
};

export type AddVersionInput = {
  parentNodeId?: string | null;
  storageInfo: DocumentFileMeta;
  owners?: string[];
  authorisation?: string[];
};

export type AddRevisionInput = {
  storageInfo: DocumentFileMeta;
};

export type MoveNodeInput = {
  parentNodeId?: string | null;
};

export type ChangeRepositoryInput = {
  repositoryId: string;
  parentNodeId?: string | null;
};

export type CopyFolderStructureInput = {
  sourceRepoId: string;
};

export type DecideAuthorisationInput = {
  status: "Approved" | "Rejected";
  message?: string;
};

export type DocumentOverviewCounts = {
  total: number;
  byPurpose: Record<DocumentPurpose, number>;
};

export type ListPublishedDocumentsQuery = {
  page: number;
  pageSize: number;
  search?: string;
  purpose?: DocumentPurpose;
  applicableModule?: DocumentApplicableModule;
  complianceTool?: DocumentComplianceTool;
  sort?: "createdOn" | "name" | "updatedAt";
  sortDir?: "asc" | "desc";
};

export type NodePathItem = {
  nodeId: string;
  name: string;
};

export const MAX_REPO_OWNERS = 3;
export const MAX_DOCUMENT_OWNERS = 5;
export const MAX_FOLDER_DEPTH = 20;
export const MAX_SIBLING_NAMES = 100;
export const MAX_REPO_NAME_LENGTH = 200;
export const MAX_NODE_NAME_LENGTH = 255;
