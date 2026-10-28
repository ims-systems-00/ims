import { apiRequest } from "@/shared/lib/http";
import type {
  CreateDocumentRepositoryInput,
  CreateFileNodesResult,
  DocumentOverviewCounts,
  DocumentRepository,
  DocumentTreeNode,
  ListRepoNodesParams,
  ListRepositoriesParams,
  PaginatedDocumentNodes,
  PaginatedDocumentRepositories,
  UpdateDocumentRepositoryInput,
  CrossOrgCopySource,
  DocumentApplicableModule,
  DocumentPurpose,
  DocumentFileMeta,
  DocumentSignature,
  InviteSignaturesInput,
  PreservedReviewer,
  PublicSignatureContext,
  ShareDocumentResult,
  SignDocumentInput,
  SignatureStatus,
} from "../types";

function toQuery(
  params: Record<string, string | number | boolean | null | undefined>
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getDocumentOverview(): Promise<DocumentOverviewCounts> {
  return apiRequest<DocumentOverviewCounts>("/document-management/overview");
}

export function listDocumentRepositories(
  params: ListRepositoriesParams = {}
): Promise<PaginatedDocumentRepositories> {
  return apiRequest<PaginatedDocumentRepositories>(
    `/document-repositories${toQuery({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      privacy: params.privacy,
      deleted: params.deleted,
      sort: params.sort,
      sortDir: params.sortDir,
    })}`
  );
}

export function getDocumentRepository(
  id: string
): Promise<DocumentRepository> {
  return apiRequest<DocumentRepository>(`/document-repositories/${id}`);
}

export function createDocumentRepository(
  body: CreateDocumentRepositoryInput
): Promise<DocumentRepository> {
  return apiRequest<DocumentRepository>("/document-repositories", {
    method: "POST",
    body,
  });
}

export function updateDocumentRepository(
  id: string,
  body: UpdateDocumentRepositoryInput
): Promise<DocumentRepository> {
  return apiRequest<DocumentRepository>(`/document-repositories/${id}`, {
    method: "PUT",
    body,
  });
}

export function softDeleteDocumentRepository(
  id: string
): Promise<DocumentRepository> {
  return apiRequest<DocumentRepository>(`/document-repositories/${id}/soft`, {
    method: "DELETE",
  });
}

export function restoreDocumentRepository(
  id: string
): Promise<DocumentRepository> {
  return apiRequest<DocumentRepository>(
    `/document-repositories/${id}/restore`,
    { method: "PUT" }
  );
}

export function hardDeleteDocumentRepository(
  id: string
): Promise<{ id: string; deleted: true }> {
  return apiRequest<{ id: string; deleted: true }>(
    `/document-repositories/${id}/hard`,
    { method: "DELETE" }
  );
}

export function listRepoNodes(
  repositoryId: string,
  params: ListRepoNodesParams = {}
): Promise<PaginatedDocumentNodes> {
  return apiRequest<PaginatedDocumentNodes>(
    `/document-repositories/${repositoryId}/nodes${toQuery({
      page: params.page,
      pageSize: params.pageSize,
      parentNodeId:
        params.parentNodeId === null
          ? "null"
          : params.parentNodeId ?? undefined,
      search: params.search,
      deleted: params.deleted,
      type: params.type,
      status: params.status,
      sort: params.sort,
      sortDir: params.sortDir,
    })}`
  );
}

export function getRepoNode(
  repositoryId: string,
  nodeId: string
): Promise<DocumentTreeNode> {
  return apiRequest<DocumentTreeNode>(
    `/document-repositories/${repositoryId}/nodes/${nodeId}`
  );
}

export function getNodeVersions(
  repositoryId: string,
  nodeId: string
): Promise<DocumentTreeNode[]> {
  return apiRequest<DocumentTreeNode[]>(
    `/document-repositories/${repositoryId}/nodes/${nodeId}/versions`
  );
}

export function getNodePath(
  repositoryId: string,
  nodeId: string
): Promise<Array<{ nodeId: string; name: string }>> {
  return apiRequest<Array<{ nodeId: string; name: string }>>(
    `/document-repositories/${repositoryId}/nodes/${nodeId}/path`
  );
}

export function createFolderNode(
  repositoryId: string,
  body: { name: string; parentNodeId?: string | null }
): Promise<DocumentTreeNode> {
  return apiRequest<DocumentTreeNode>(
    `/document-repositories/${repositoryId}/folder-nodes`,
    {
      method: "POST",
      body: {
        name: body.name,
        parentNode: body.parentNodeId ?? null,
      },
    }
  );
}

export function createFileNodes(
  repositoryId: string,
  body: {
    parentNodeId?: string | null;
    data: Array<{
      storageInfo: DocumentFileMeta;
      purpose?: DocumentPurpose;
      applicableModules?: DocumentApplicableModule[];
      authorisation?: string[];
      owners?: string[];
      reviewDate?: string | null;
    }>;
  }
): Promise<CreateFileNodesResult> {
  return apiRequest<CreateFileNodesResult>(
    `/document-repositories/${repositoryId}/file-nodes`,
    {
      method: "POST",
      body: {
        parentNode: body.parentNodeId ?? null,
        data: body.data,
      },
    }
  );
}

export function updateDocumentNode(
  repositoryId: string,
  nodeId: string,
  body: {
    purpose?: DocumentPurpose;
    owners?: string[];
    applicableModules?: DocumentApplicableModule[];
    reviewDate?: string | null;
  }
): Promise<DocumentTreeNode> {
  return apiRequest<DocumentTreeNode>(
    `/document-repositories/${repositoryId}/file-nodes/${nodeId}`,
    {
      method: "PUT",
      body,
    }
  );
}

export function softDeleteNode(
  repositoryId: string,
  nodeId: string
): Promise<{ id: string; movedToBin: true }> {
  return apiRequest<{ id: string; movedToBin: true }>(
    `/document-repositories/${repositoryId}/nodes/${nodeId}/soft`,
    { method: "DELETE" }
  );
}

export function restoreNode(
  repositoryId: string,
  nodeId: string
): Promise<DocumentTreeNode> {
  return apiRequest<DocumentTreeNode>(
    `/document-repositories/${repositoryId}/nodes/${nodeId}/restore`,
    { method: "PUT" }
  );
}

export function hardDeleteNode(
  repositoryId: string,
  nodeId: string
): Promise<{ id: string; deleted: true }> {
  return apiRequest<{ id: string; deleted: true }>(
    `/document-repositories/${repositoryId}/nodes/${nodeId}/hard`,
    { method: "DELETE" }
  );
}

export function addDocumentVersion(
  repositoryId: string,
  nodeId: string,
  body: {
    parentNodeId?: string | null;
    storageInfo: DocumentFileMeta;
    owners?: string[];
    authorisation?: string[];
  }
): Promise<DocumentTreeNode> {
  return apiRequest<DocumentTreeNode>(
    `/document-repositories/${repositoryId}/nodes/${nodeId}/new-version`,
    {
      method: "POST",
      body: {
        parentNodeId: body.parentNodeId ?? null,
        data: {
          storageInfo: body.storageInfo,
          owners: body.owners,
          authorisation: body.authorisation,
        },
      },
    }
  );
}

export function revisePendingDocument(
  repositoryId: string,
  nodeId: string,
  storageInfo: DocumentFileMeta
): Promise<DocumentTreeNode> {
  return apiRequest<DocumentTreeNode>(
    `/document-repositories/${repositoryId}/nodes/${nodeId}/revision`,
    {
      method: "PUT",
      body: { storageInfo },
    }
  );
}

/** Select+implement clause/section and attach this document as evidence. */
export function applyDocumentComplianceClauses(
  repositoryId: string,
  nodeId: string,
  body: { toolkitId: string; clauseIds: string[] }
): Promise<DocumentTreeNode> {
  return apiRequest<DocumentTreeNode>(
    `/document-repositories/${repositoryId}/file-nodes/${nodeId}/compliance-apply`,
    { method: "POST", body }
  );
}

export function clearDocumentComplianceLinks(
  repositoryId: string,
  nodeId: string
): Promise<DocumentTreeNode> {
  return apiRequest<DocumentTreeNode>(
    `/document-repositories/${repositoryId}/file-nodes/${nodeId}/compliance-links`,
    { method: "DELETE" }
  );
}

export function moveRepoNode(
  repositoryId: string,
  nodeId: string,
  parentNodeId: string | null
): Promise<DocumentTreeNode> {
  return apiRequest<DocumentTreeNode>(
    `/document-repositories/${repositoryId}/nodes/${nodeId}/move-node`,
    {
      method: "PUT",
      body: { parentNodeId },
    }
  );
}

export function changeNodeRepository(
  repositoryId: string,
  nodeId: string,
  body: { repositoryId: string; parentNodeId?: string | null }
): Promise<DocumentTreeNode> {
  return apiRequest<DocumentTreeNode>(
    `/document-repositories/${repositoryId}/nodes/${nodeId}/change-repository`,
    {
      method: "PUT",
      body: {
        repositoryId: body.repositoryId,
        parentNodeId: body.parentNodeId ?? null,
      },
    }
  );
}

export function copyFolderStructure(
  repositoryId: string,
  sourceRepoId: string,
  sourceOrgId?: string
): Promise<{ copied: true }> {
  return apiRequest<{ copied: true }>(
    `/document-repositories/${repositoryId}/copy-folder-structure`,
    {
      method: "POST",
      body: { sourceRepoId, sourceOrgId },
    }
  );
}

export function listCrossOrgCopySources(): Promise<CrossOrgCopySource[]> {
  return apiRequest<CrossOrgCopySource[]>(
    "/document-repositories/cross-org-copy-sources"
  );
}

export function decideNodeAuthorisation(
  repositoryId: string,
  nodeId: string,
  authorisationId: string,
  body: { status: "Approved" | "Rejected"; message?: string }
): Promise<DocumentTreeNode> {
  return apiRequest<DocumentTreeNode>(
    `/document-repositories/${repositoryId}/nodes/${nodeId}/authorisation/${authorisationId}`,
    {
      method: "PUT",
      body,
    }
  );
}

export function shareDocument(
  repositoryId: string,
  nodeId: string,
  body: { emails: string[]; message?: string }
): Promise<ShareDocumentResult> {
  return apiRequest<ShareDocumentResult>(
    `/document-repositories/${repositoryId}/nodes/${nodeId}/share`,
    { method: "POST", body }
  );
}

export function inviteSignatures(
  repositoryId: string,
  nodeId: string,
  body: InviteSignaturesInput
): Promise<DocumentSignature[]> {
  return apiRequest<DocumentSignature[]>(
    `/document-repositories/${repositoryId}/nodes/${nodeId}/signatures`,
    { method: "POST", body }
  );
}

export function listSignatures(
  repositoryId: string,
  nodeId: string
): Promise<DocumentSignature[]> {
  return apiRequest<DocumentSignature[]>(
    `/document-repositories/${repositoryId}/nodes/${nodeId}/signatures`
  );
}

export function resendSignature(
  repositoryId: string,
  nodeId: string,
  signatureId: string
): Promise<DocumentSignature> {
  return apiRequest<DocumentSignature>(
    `/document-repositories/${repositoryId}/nodes/${nodeId}/signatures/${signatureId}/resend`,
    { method: "POST" }
  );
}

export function removeSignature(
  repositoryId: string,
  nodeId: string,
  signatureId: string
): Promise<{ id: string; deleted: true }> {
  return apiRequest<{ id: string; deleted: true }>(
    `/document-repositories/${repositoryId}/nodes/${nodeId}/signatures/${signatureId}`,
    { method: "DELETE" }
  );
}

export function listPreservedReviewers(
  repositoryId: string,
  nodeId: string
): Promise<PreservedReviewer[]> {
  return apiRequest<PreservedReviewer[]>(
    `/document-repositories/${repositoryId}/nodes/${nodeId}/preserved-reviewers`
  );
}

export function signDocument(
  repositoryId: string,
  nodeId: string,
  signatureId: string,
  body: SignDocumentInput
): Promise<DocumentSignature> {
  return apiRequest<DocumentSignature>(
    `/document-repositories/${repositoryId}/nodes/${nodeId}/signatures/${signatureId}/sign`,
    { method: "PUT", body }
  );
}

export function listSignatureRequests(params: {
  mine?: boolean;
  status?: SignatureStatus;
}): Promise<DocumentSignature[]> {
  return apiRequest<DocumentSignature[]>(
    `/document-signatures/requests${toQuery(params)}`
  );
}

export function getPublicSignature(
  token: string
): Promise<PublicSignatureContext> {
  return apiRequest<PublicSignatureContext>(
    `/document-signatures/public/${token}`
  );
}

export function signDocumentPublic(
  token: string,
  body: SignDocumentInput
): Promise<DocumentSignature> {
  return apiRequest<DocumentSignature>(
    `/document-signatures/public/${token}/sign`,
    { method: "PUT", body }
  );
}

export function listPublishedDocuments(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  purpose?: DocumentPurpose;
  applicableModule?: DocumentApplicableModule;
}): Promise<PaginatedDocumentNodes> {
  return apiRequest<PaginatedDocumentNodes>(
    `/document-trees${toQuery(params)}`
  );
}

/** Resolve a document node by id (for cross-module deep links). */
export function getDocumentTreeNode(nodeId: string): Promise<DocumentTreeNode> {
  return apiRequest<DocumentTreeNode>(`/document-trees/${nodeId}`);
}
