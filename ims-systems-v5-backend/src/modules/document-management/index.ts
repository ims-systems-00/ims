/**
 * Document Management module public surface.
 * Spec: docs/module-specifications/document-management.md
 *
 * Import only from this barrel outside the module.
 */

export {
  createDocumentManagementModule,
  type DocumentManagementRouterDeps,
} from "./routes/document-management.routes";

export {
  createDocumentManagementService,
  type DocumentManagementService,
  type DocumentManagementApplicationPort,
  type DocumentManagementServiceDeps,
} from "./services/document-management.service";

export {
  createDocumentFilesAdapter,
  createDocumentActivityAdapter,
  createDocumentNotificationAdapter,
} from "./adapters";

export {
  NoOpDocumentFilesAdapter,
  NoOpDocumentActivityAdapter,
  NoOpDocumentNotificationAdapter,
  type DocumentFilesPort,
  type DocumentActivityPort,
  type DocumentNotificationPort,
} from "./ports";

export {
  DOCUMENT_MANAGEMENT_RESOURCE,
  DOCUMENT_PRIVACY_VALUES,
  DOCUMENT_PURPOSES,
  DOCUMENT_STATUSES,
  DOCUMENT_APPLICABLE_MODULES,
  DOCUMENT_COMPLIANCE_TOOLS,
  type DocumentRepository,
  type DocumentTreeNode,
  type DocumentOverviewCounts,
  type DocumentPurpose,
  type DocumentPrivacy,
} from "./types";

/** Test helpers — prefer application port from createDocumentManagementModule. */
export { getDocumentRepositoryModel } from "./repositories/document-repository.model";
export { getDocumentTreeModel } from "./repositories/document-tree.model";
