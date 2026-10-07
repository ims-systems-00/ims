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
  DocumentApplicableModule,
  DocumentPurpose,
  DocumentFileMeta,
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
