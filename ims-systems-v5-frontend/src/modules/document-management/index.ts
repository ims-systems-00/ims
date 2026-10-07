/**
 * Document Management module public surface.
 */

export { DocumentsPage } from "./pages/documents-page";
export { RepositoryDetailPage } from "./pages/repository-detail-page";
export {
  DocumentsTabs,
} from "./components/documents-tabs";
export { DocumentsOverviewPanel } from "./components/documents-overview-panel";
export { RepositoriesPanel } from "./components/repositories-panel";
export { RepositoryWorkspace } from "./components/repository-workspace";
export { useDocumentsUiStore } from "./store/use-documents-ui-store";
export {
  documentManagementKeys,
  useDocumentOverviewQuery,
  useDocumentRepositoriesQuery,
  useDocumentRepositoryQuery,
  useRepoNodesQuery,
  useCreateDocumentRepositoryMutation,
} from "./hooks/use-document-management";
export type {
  DocumentRepository,
  DocumentTreeNode,
  DocumentOverviewCounts,
  DocumentPurpose,
  DocumentPrivacy,
  DocumentsTabId,
} from "./types";
export {
  DOCUMENT_PURPOSES,
  DOCUMENT_PURPOSE_LABELS,
  DOCUMENT_PRIVACY_VALUES,
} from "./types";
