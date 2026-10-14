import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDocumentVersion,
  changeNodeRepository,
  copyFolderStructure,
  createDocumentRepository,
  createFileNodes,
  createFolderNode,
  decideNodeAuthorisation,
  getDocumentOverview,
  getDocumentRepository,
  getNodePath,
  getRepoNode,
  hardDeleteDocumentRepository,
  hardDeleteNode,
  listDocumentRepositories,
  listPublishedDocuments,
  listRepoNodes,
  moveRepoNode,
  restoreDocumentRepository,
  restoreNode,
  revisePendingDocument,
  softDeleteDocumentRepository,
  softDeleteNode,
  updateDocumentNode,
  updateDocumentRepository,
} from "../api/document-management";
import type {
  CreateDocumentRepositoryInput,
  DocumentApplicableModule,
  DocumentFileMeta,
  DocumentPurpose,
  ListRepoNodesParams,
  ListRepositoriesParams,
  UpdateDocumentRepositoryInput,
} from "../types";

export const documentManagementKeys = {
  all: ["document-management"] as const,
  overview: () => [...documentManagementKeys.all, "overview"] as const,
  repositories: () => [...documentManagementKeys.all, "repositories"] as const,
  repositoryList: (params: ListRepositoriesParams) =>
    [...documentManagementKeys.repositories(), "list", params] as const,
  repositoryDetail: (id: string) =>
    [...documentManagementKeys.repositories(), "detail", id] as const,
  nodes: (repositoryId: string) =>
    [...documentManagementKeys.all, "nodes", repositoryId] as const,
  nodeList: (repositoryId: string, params: ListRepoNodesParams) =>
    [...documentManagementKeys.nodes(repositoryId), "list", params] as const,
  nodeDetail: (repositoryId: string, nodeId: string) =>
    [...documentManagementKeys.nodes(repositoryId), "detail", nodeId] as const,
  nodePath: (repositoryId: string, nodeId: string) =>
    [...documentManagementKeys.nodes(repositoryId), "path", nodeId] as const,
  published: (params: Record<string, unknown>) =>
    [...documentManagementKeys.all, "published", params] as const,
};

async function invalidateDocumentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  repositoryId?: string
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: documentManagementKeys.overview(),
    }),
    queryClient.invalidateQueries({
      queryKey: documentManagementKeys.repositories(),
    }),
    queryClient.invalidateQueries({
      queryKey: documentManagementKeys.all,
    }),
    ...(repositoryId
      ? [
          queryClient.invalidateQueries({
            queryKey: documentManagementKeys.nodes(repositoryId),
          }),
        ]
      : []),
  ]);
}

export function useDocumentOverviewQuery() {
  return useQuery({
    queryKey: documentManagementKeys.overview(),
    queryFn: getDocumentOverview,
  });
}

export function useDocumentRepositoriesQuery(params: ListRepositoriesParams) {
  return useQuery({
    queryKey: documentManagementKeys.repositoryList(params),
    queryFn: () => listDocumentRepositories(params),
  });
}

export function useDocumentRepositoryQuery(id: string | undefined) {
  return useQuery({
    queryKey: documentManagementKeys.repositoryDetail(id ?? ""),
    queryFn: () => getDocumentRepository(id!),
    enabled: Boolean(id),
  });
}

export function useRepoNodesQuery(
  repositoryId: string | undefined,
  params: ListRepoNodesParams
) {
  return useQuery({
    queryKey: documentManagementKeys.nodeList(repositoryId ?? "", params),
    queryFn: () => listRepoNodes(repositoryId!, params),
    enabled: Boolean(repositoryId),
  });
}

export function useRepoNodeQuery(
  repositoryId: string | undefined,
  nodeId: string | undefined
) {
  return useQuery({
    queryKey: documentManagementKeys.nodeDetail(
      repositoryId ?? "",
      nodeId ?? ""
    ),
    queryFn: () => getRepoNode(repositoryId!, nodeId!),
    enabled: Boolean(repositoryId && nodeId),
  });
}

export function useNodePathQuery(
  repositoryId: string | undefined,
  nodeId: string | null | undefined
) {
  return useQuery({
    queryKey: documentManagementKeys.nodePath(
      repositoryId ?? "",
      nodeId ?? "root"
    ),
    queryFn: () => getNodePath(repositoryId!, nodeId!),
    enabled: Boolean(repositoryId && nodeId),
  });
}

export function usePublishedDocumentsQuery(params: {
  page?: number;
  pageSize?: number;
  purpose?: DocumentPurpose;
  applicableModule?: DocumentApplicableModule;
  search?: string;
}) {
  return useQuery({
    queryKey: documentManagementKeys.published(params),
    queryFn: () => listPublishedDocuments(params),
  });
}

export function useCreateDocumentRepositoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDocumentRepositoryInput) =>
      createDocumentRepository(body),
    onSuccess: async () => {
      await invalidateDocumentQueries(queryClient);
    },
  });
}

export function useUpdateDocumentRepositoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateDocumentRepositoryInput;
    }) => updateDocumentRepository(id, body),
    onSuccess: async (repo) => {
      await invalidateDocumentQueries(queryClient, repo.id);
    },
  });
}

export function useSoftDeleteDocumentRepositoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => softDeleteDocumentRepository(id),
    onSuccess: async () => {
      await invalidateDocumentQueries(queryClient);
    },
  });
}

export function useRestoreDocumentRepositoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreDocumentRepository(id),
    onSuccess: async () => {
      await invalidateDocumentQueries(queryClient);
    },
  });
}

export function useHardDeleteDocumentRepositoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hardDeleteDocumentRepository(id),
    onSuccess: async () => {
      await invalidateDocumentQueries(queryClient);
    },
  });
}

export function useCreateFolderNodeMutation(repositoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; parentNodeId?: string | null }) =>
      createFolderNode(repositoryId, body),
    onSuccess: async () => {
      await invalidateDocumentQueries(queryClient, repositoryId);
    },
  });
}

export function useCreateFileNodesMutation(repositoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      parentNodeId?: string | null;
      data: Array<{
        storageInfo: DocumentFileMeta;
        purpose?: DocumentPurpose;
        applicableModules?: DocumentApplicableModule[];
        authorisation?: string[];
        owners?: string[];
        reviewDate?: string | null;
      }>;
    }) => createFileNodes(repositoryId, body),
    onSuccess: async () => {
      await invalidateDocumentQueries(queryClient, repositoryId);
    },
  });
}

export function useUpdateDocumentNodeMutation(repositoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      nodeId,
      body,
    }: {
      nodeId: string;
      body: {
        purpose?: DocumentPurpose;
        owners?: string[];
        applicableModules?: DocumentApplicableModule[];
        reviewDate?: string | null;
      };
    }) => updateDocumentNode(repositoryId, nodeId, body),
    onSuccess: async () => {
      await invalidateDocumentQueries(queryClient, repositoryId);
    },
  });
}

export function useSoftDeleteNodeMutation(repositoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nodeId: string) => softDeleteNode(repositoryId, nodeId),
    onSuccess: async () => {
      await invalidateDocumentQueries(queryClient, repositoryId);
    },
  });
}

export function useRestoreNodeMutation(repositoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nodeId: string) => restoreNode(repositoryId, nodeId),
    onSuccess: async () => {
      await invalidateDocumentQueries(queryClient, repositoryId);
    },
  });
}

export function useHardDeleteNodeMutation(repositoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nodeId: string) => hardDeleteNode(repositoryId, nodeId),
    onSuccess: async () => {
      await invalidateDocumentQueries(queryClient, repositoryId);
    },
  });
}

export function useAddDocumentVersionMutation(repositoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      nodeId: string;
      parentNodeId?: string | null;
      storageInfo: DocumentFileMeta;
      owners?: string[];
      authorisation?: string[];
    }) =>
      addDocumentVersion(repositoryId, input.nodeId, {
        parentNodeId: input.parentNodeId,
        storageInfo: input.storageInfo,
        owners: input.owners,
        authorisation: input.authorisation,
      }),
    onSuccess: async () => {
      await invalidateDocumentQueries(queryClient, repositoryId);
    },
  });
}

export function useRevisePendingDocumentMutation(repositoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { nodeId: string; storageInfo: DocumentFileMeta }) =>
      revisePendingDocument(repositoryId, input.nodeId, input.storageInfo),
    onSuccess: async () => {
      await invalidateDocumentQueries(queryClient, repositoryId);
    },
  });
}

export function useMoveRepoNodeMutation(repositoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { nodeId: string; parentNodeId: string | null }) =>
      moveRepoNode(repositoryId, input.nodeId, input.parentNodeId),
    onSuccess: async () => {
      await invalidateDocumentQueries(queryClient, repositoryId);
    },
  });
}

export function useChangeNodeRepositoryMutation(repositoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      nodeId: string;
      targetRepositoryId: string;
      parentNodeId?: string | null;
    }) =>
      changeNodeRepository(repositoryId, input.nodeId, {
        repositoryId: input.targetRepositoryId,
        parentNodeId: input.parentNodeId,
      }),
    onSuccess: async (_node, variables) => {
      await invalidateDocumentQueries(queryClient, repositoryId);
      await invalidateDocumentQueries(
        queryClient,
        variables.targetRepositoryId
      );
    },
  });
}

export function useCopyFolderStructureMutation(repositoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceRepoId: string) =>
      copyFolderStructure(repositoryId, sourceRepoId),
    onSuccess: async () => {
      await invalidateDocumentQueries(queryClient, repositoryId);
    },
  });
}

export function useDecideAuthorisationMutation(repositoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      nodeId: string;
      authorisationId: string;
      status: "Approved" | "Rejected";
      message?: string;
    }) =>
      decideNodeAuthorisation(
        repositoryId,
        input.nodeId,
        input.authorisationId,
        { status: input.status, message: input.message }
      ),
    onSuccess: async () => {
      await invalidateDocumentQueries(queryClient, repositoryId);
    },
  });
}
