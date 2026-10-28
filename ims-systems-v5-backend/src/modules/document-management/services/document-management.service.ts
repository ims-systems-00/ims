/**
 * Document Management application service.
 * Spec: docs/module-specifications/document-management.md
 *
 * Foundation: repositories, folders/documents, versions, authorisation,
 * recycle bin, overview, published picker. Signatures / share email / cron later.
 */

import { randomUUID } from "node:crypto";
import {
  DEFAULT_IMS_EMAIL_BRANDING,
  renderEmail,
  type EmailBranding,
} from "../../../infrastructure/email/templates";
import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import {
  NoOpDocumentComplianceLinkAdapter,
  NoOpDocumentMembershipAdapter,
  type DocumentActivityPort,
  type DocumentComplianceLinkPort,
  type DocumentEmailPort,
  type DocumentFilesPort,
  type DocumentMembershipPort,
  type DocumentNotificationPort,
} from "../ports";
import {
  createDocumentAccessTokenStore,
  generateAccessToken,
  type DocumentAccessTokenStore,
} from "../repositories/document-access-token.repository";
import {
  createDocumentSignatureStore,
  type DocumentSignatureStore,
} from "../repositories/document-signature.repository";
import { stampSignaturePdf } from "./document-signature-stamp";
import type { DocumentRepositoryStore } from "../repositories/document-repository.repository";
import type { DocumentTreeStore } from "../repositories/document-tree.repository";
import { normalizeFileMeta } from "../schemas";
import {
  DOCUMENT_MANAGEMENT_RESOURCE,
  MAX_DOCUMENT_OWNERS,
  MAX_FOLDER_DEPTH,
  MAX_REPO_OWNERS,
  MAX_SIBLING_NAMES,
  type AddRevisionInput,
  type AddVersionInput,
  type ChangeRepositoryInput,
  type CopyFolderStructureInput,
  type CreateDocumentRepositoryInput,
  type CrossOrgCopySource,
  type DocumentUtilisation,
  type CreateFileNodesInput,
  type CreateFileNodesResult,
  type CreateFolderNodeInput,
  type DecideAuthorisationInput,
  type DocumentOverviewCounts,
  type DocumentSignature,
  type InviteSignaturesInput,
  type SignDocumentInput,
  type DocumentRepository,
  type DocumentTreeNode,
  type ListDocumentRepositoriesQuery,
  type ListPublishedDocumentsQuery,
  type ListRepoNodesQuery,
  type MoveNodeInput,
  type NodePathItem,
  type PaginatedDocumentNodes,
  type PaginatedDocumentRepositories,
  type UpdateDocumentNodeInput,
  type UpdateDocumentRepositoryInput,
  type UpdateFolderNodeInput,
} from "../types";

function requireOrgIdentity(identity: SecurityIdentity | null | undefined): {
  identity: SecurityIdentity;
  organizationId: string;
  subjectId: string;
} {
  if (!identity?.subjectId) throw new UnauthorizedError();
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return {
    identity,
    organizationId: identity.organizationId,
    subjectId: identity.subjectId,
  };
}

function nextReference(prefix: "REP" | "DOC"): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (value === undefined) return null;
  if (value === null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationAppError("Invalid review date");
  }
  return date;
}

function uniqueIds(ids: string[], max: number): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, max);
}

export type DocumentManagementServiceDeps = {
  repositories: DocumentRepositoryStore;
  trees: DocumentTreeStore;
  authorizer: Authorizer;
  files: DocumentFilesPort;
  activities: DocumentActivityPort;
  notifications: DocumentNotificationPort;
  email?: DocumentEmailPort;
  memberships?: DocumentMembershipPort;
  accessTokens?: DocumentAccessTokenStore;
  signatures?: DocumentSignatureStore;
  complianceLinks?: DocumentComplianceLinkPort;
  /** Base URL used in emailed links, e.g. https://app.example.com */
  accessLinkBaseUrl?: string;
  /** Resolves org logo/theme for transactional document emails. */
  resolveEmailBranding?: (organizationId: string) => Promise<EmailBranding>;
};

export type DocumentManagementService = ReturnType<
  typeof createDocumentManagementService
>;

export type DocumentManagementApplicationPort = {
  getPublishedDocument(
    organizationId: string,
    id: string
  ): Promise<DocumentTreeNode | null>;
  listPublished(
    organizationId: string,
    query: ListPublishedDocumentsQuery
  ): Promise<PaginatedDocumentNodes>;
  getDocumentUtilisation(
    organizationId: string
  ): Promise<DocumentUtilisation>;
};

export function createDocumentManagementService(
  deps: DocumentManagementServiceDeps
) {
  const { repositories, trees, authorizer, files, activities, notifications } =
    deps;
  const memberships = deps.memberships ?? new NoOpDocumentMembershipAdapter();
  const accessTokens =
    deps.accessTokens ?? createDocumentAccessTokenStore();
  const signatures = deps.signatures ?? createDocumentSignatureStore();
  const complianceLinks =
    deps.complianceLinks ?? new NoOpDocumentComplianceLinkAdapter();
  const accessLinkBaseUrl = (deps.accessLinkBaseUrl ?? "").replace(/\/+$/, "");

  async function brandingFor(
    organizationId: string
  ): Promise<EmailBranding> {
    if (!deps.resolveEmailBranding) return DEFAULT_IMS_EMAIL_BRANDING;
    try {
      return await deps.resolveEmailBranding(organizationId);
    } catch {
      return DEFAULT_IMS_EMAIL_BRANDING;
    }
  }

  async function assertAllowed(
    identity: SecurityIdentity,
    action: "read" | "create" | "update" | "delete"
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: DOCUMENT_MANAGEMENT_RESOURCE,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access Document Management"
      );
    }
  }

  async function requireRepository(
    organizationId: string,
    id: string,
    options?: { includeDeleted?: boolean }
  ): Promise<DocumentRepository> {
    const repo = await repositories.findById(organizationId, id, options);
    if (!repo) throw new NotFoundError("Document repository not found");
    return repo;
  }

  async function requireNode(
    organizationId: string,
    id: string,
    options?: { includeDeleted?: boolean }
  ): Promise<DocumentTreeNode> {
    const node = await trees.findById(organizationId, id, options);
    if (!node) throw new NotFoundError("Document node not found");
    return node;
  }

  async function assertFolderDepth(
    organizationId: string,
    parentNodeId: string | null
  ): Promise<void> {
    if (!parentNodeId) return;
    const path = await trees.buildPath(organizationId, parentNodeId);
    if (path.length >= MAX_FOLDER_DEPTH) {
      throw new ValidationAppError(
        `Maximum folder depth of ${MAX_FOLDER_DEPTH} exceeded`
      );
    }
  }

  async function assertSiblingCapacity(
    organizationId: string,
    repositoryId: string,
    parentNodeId: string | null,
    name: string
  ): Promise<void> {
    const existing = await trees.findActiveByName(
      organizationId,
      repositoryId,
      parentNodeId,
      name
    );
    if (existing) {
      throw new ConflictError(
        `A folder or document named "${name}" already exists at this location`
      );
    }
    const count = await trees.countSiblingNames(
      organizationId,
      repositoryId,
      parentNodeId
    );
    if (count >= MAX_SIBLING_NAMES) {
      throw new ValidationAppError(
        `A folder may have at most ${MAX_SIBLING_NAMES} distinct sibling names`
      );
    }
  }

  async function recordActivity(
    organizationId: string,
    moduleId: string,
    value: string,
    createdBy: string,
    threadId?: string
  ): Promise<void> {
    try {
      await activities.record({
        organizationId,
        moduleId,
        value,
        createdBy,
        threadId,
      });
    } catch {
      // Non-fatal — document mutation already succeeded.
    }
  }

  async function notifyUsers(
    organizationId: string,
    createdBy: string,
    recipientIds: string[],
    title: string,
    message: string,
    referenceModuleId?: string
  ): Promise<void> {
    const recipients = [...new Set(recipientIds)]
      .filter((id) => id && id !== createdBy)
      .map((recipientUserId) => ({
        recipientUserId,
        title,
        message,
        referenceModuleId,
      }));
    if (recipients.length === 0) return;
    try {
      await notifications.notify({
        organizationId,
        createdBy,
        recipients,
      });
    } catch {
      // Non-fatal.
    }
  }

  async function assertSuperAdmin(
    subjectId: string,
    organizationId: string
  ): Promise<void> {
    const role = await memberships.getRole(subjectId, organizationId);
    if (role !== "Super Admin") {
      throw new ForbiddenError(
        "Cross-organisation folder copy requires Super Admin membership in both organisations"
      );
    }
  }

  async function copyFoldersRecursive(
    sourceOrganizationId: string,
    targetOrganizationId: string,
    sourceRepoId: string,
    targetRepoId: string,
    subjectId: string,
    sourceParentId: string | null,
    targetParentId: string | null
  ): Promise<void> {
    const children = await trees.listChildren(
      sourceOrganizationId,
      sourceRepoId,
      {
        page: 1,
        pageSize: 200,
        parentNodeId: sourceParentId,
        type: "folder",
        sort: "name",
        sortDir: "asc",
      }
    );

    for (const folder of children.items) {
      const created = await trees.createFolder(targetOrganizationId, {
        reference: nextReference("DOC"),
        repositoryId: targetRepoId,
        name: folder.name,
        parentNodeId: targetParentId,
        reviewDate: folder.folderData?.reviewDate ?? null,
        createdBy: subjectId,
        createdOn: new Date(),
      });
      await copyFoldersRecursive(
        sourceOrganizationId,
        targetOrganizationId,
        sourceRepoId,
        targetRepoId,
        subjectId,
        folder.id,
        created.id
      );
    }
  }

  return {
    async overview(
      identity: SecurityIdentity | null | undefined
    ): Promise<DocumentOverviewCounts> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      return trees.overviewCounts(organizationId);
    },

    async createRepository(
      identity: SecurityIdentity | null | undefined,
      input: CreateDocumentRepositoryInput
    ): Promise<DocumentRepository> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");

      const name = input.name.trim();
      if (!name) throw new ValidationAppError("Name is required");

      let owners = uniqueIds(input.owners ?? [], MAX_REPO_OWNERS);
      if (input.privacy === "Only me" || input.privacy === "Custom") {
        owners = uniqueIds([subjectId, ...owners], MAX_REPO_OWNERS);
      }
      if (owners.length < 1) {
        owners = [subjectId];
      }
      if (!owners.includes(subjectId)) {
        owners = uniqueIds([subjectId, ...owners], MAX_REPO_OWNERS);
      }

      const sharedWith =
        input.privacy === "Custom"
          ? uniqueIds(input.sharedWith ?? [], 100)
          : [];

      if (input.privacy === "Business unit" && !input.businessUnitId) {
        throw new ValidationAppError(
          "Business unit is required when privacy is Business unit"
        );
      }

      const repo = await repositories.create(organizationId, {
        reference: nextReference("REP"),
        name,
        description: (input.description ?? "").trim(),
        privacy: input.privacy,
        businessUnitId:
          input.privacy === "Business unit"
            ? input.businessUnitId ?? null
            : null,
        owners,
        sharedWith,
        reviewInterval: input.reviewInterval ?? "Yearly",
        createdBy: subjectId,
        createdOn: new Date(),
      });

      if (input.copyFolderStructureFromId) {
        await requireRepository(
          organizationId,
          input.copyFolderStructureFromId
        );
        await copyFoldersRecursive(
          organizationId,
          organizationId,
          input.copyFolderStructureFromId,
          repo.id,
          subjectId,
          null,
          null
        );
      }

      await notifyUsers(
        organizationId,
        subjectId,
        [...owners, ...sharedWith],
        "Document repository created",
        `You have access to repository "${repo.name}" (${repo.reference}).`,
        repo.id
      );

      return repo;
    },

    async listRepositories(
      identity: SecurityIdentity | null | undefined,
      query: ListDocumentRepositoriesQuery
    ): Promise<PaginatedDocumentRepositories> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      return repositories.list(organizationId, query, { subjectId });
    },

    async getRepository(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<DocumentRepository> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      return requireRepository(organizationId, id);
    },

    async updateRepository(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateDocumentRepositoryInput
    ): Promise<DocumentRepository> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      // V4 gates repository update with Read.
      await assertAllowed(actor, "read");

      const existing = await requireRepository(organizationId, id);
      const privacy = input.privacy ?? existing.privacy;
      const owners =
        input.owners !== undefined
          ? uniqueIds(input.owners, MAX_REPO_OWNERS)
          : existing.owners;
      if (owners.length < 1) {
        throw new ValidationAppError("At least one owner is required");
      }
      if (privacy === "Business unit") {
        const bu =
          input.businessUnitId !== undefined
            ? input.businessUnitId
            : existing.businessUnitId;
        if (!bu) {
          throw new ValidationAppError(
            "Business unit is required when privacy is Business unit"
          );
        }
      }

      const updated = await repositories.update(organizationId, id, {
        name: input.name?.trim(),
        description:
          input.description === undefined
            ? undefined
            : input.description === null
              ? ""
              : input.description.trim(),
        privacy: input.privacy,
        businessUnitId:
          privacy === "Business unit"
            ? input.businessUnitId !== undefined
              ? input.businessUnitId
              : existing.businessUnitId
            : null,
        owners,
        sharedWith:
          privacy === "Custom"
            ? input.sharedWith !== undefined
              ? uniqueIds(input.sharedWith, 100)
              : existing.sharedWith
            : [],
        reviewInterval: input.reviewInterval,
        updatedBy: subjectId,
        updatedOn: new Date(),
      });
      if (!updated) throw new NotFoundError("Document repository not found");

      const addedOwners = owners.filter((o) => !existing.owners.includes(o));
      if (addedOwners.length > 0) {
        await notifyUsers(
          organizationId,
          subjectId,
          addedOwners,
          "Repository ownership",
          `You were added as an owner of repository "${updated.name}".`,
          updated.id
        );
      }
      return updated;
    },

    async softDeleteRepository(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<DocumentRepository> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "delete");
      await requireRepository(organizationId, id);
      const deleted = await repositories.softDelete(
        organizationId,
        id,
        subjectId
      );
      if (!deleted) throw new NotFoundError("Document repository not found");
      await trees.softDeleteByRepository(organizationId, id, subjectId);
      return deleted;
    },

    async restoreRepository(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<DocumentRepository> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "delete");
      const restored = await repositories.restore(
        organizationId,
        id,
        subjectId
      );
      if (!restored) throw new NotFoundError("Document repository not found");
      return restored;
    },

    async hardDeleteRepository(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<{ id: string; deleted: true }> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "delete");
      const existing = await repositories.findById(organizationId, id, {
        includeDeleted: true,
      });
      if (!existing) throw new NotFoundError("Document repository not found");

      const nodes = await trees.hardDeleteByRepository(organizationId, id);
      for (const node of nodes) {
        const meta = node.documentData?.storageInfo;
        if (meta) {
          try {
            await files.deleteStoredFile(meta);
          } catch {
            // Continue deleting siblings.
          }
        }
      }
      await repositories.hardDelete(organizationId, id);
      return { id, deleted: true };
    },

    async copyFolderStructure(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      input: CopyFolderStructureInput
    ): Promise<{ copied: true }> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      await requireRepository(organizationId, repositoryId);

      const sourceOrgId = input.sourceOrgId ?? organizationId;
      if (sourceOrgId !== organizationId) {
        // Cross-org copy (spec §10): Super Admin in BOTH organisations.
        await assertSuperAdmin(subjectId, organizationId);
        await assertSuperAdmin(subjectId, sourceOrgId);
      }
      await requireRepository(sourceOrgId, input.sourceRepoId);
      await copyFoldersRecursive(
        sourceOrgId,
        organizationId,
        input.sourceRepoId,
        repositoryId,
        subjectId,
        null,
        null
      );
      return { copied: true };
    },

    /**
     * Organisations (other than the current one) where the caller is a
     * Super Admin, with their repositories — cross-org copy sources.
     */
    async listCrossOrgCopySources(
      identity: SecurityIdentity | null | undefined
    ): Promise<CrossOrgCopySource[]> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      await assertSuperAdmin(subjectId, organizationId);

      const orgIds = await memberships.listOrganizationIdsForUser(subjectId);
      const sources: CrossOrgCopySource[] = [];
      for (const orgId of orgIds) {
        if (orgId === organizationId) continue;
        const role = await memberships.getRole(subjectId, orgId);
        if (role !== "Super Admin") continue;
        const repos = await repositories.listAllActive(orgId);
        sources.push({
          organizationId: orgId,
          repositories: repos.map((repo) => ({
            id: repo.id,
            name: repo.name,
            reference: repo.reference,
          })),
        });
      }
      return sources;
    },

    /** Document utilisation for Stats digital-maturity (stats.md §5). */
    async getDocumentUtilisation(
      organizationId: string
    ): Promise<DocumentUtilisation> {
      const [repos, counts] = await Promise.all([
        repositories.listAllActive(organizationId),
        trees.overviewCounts(organizationId),
      ]);
      return {
        businessUnitIds: [
          ...new Set(
            repos
              .map((repo) => repo.businessUnitId)
              .filter((id): id is string => Boolean(id))
          ),
        ],
        hasPublishedDocuments: counts.total > 0,
      };
    },

    async createFolder(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      input: CreateFolderNodeInput
    ): Promise<DocumentTreeNode> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      await requireRepository(organizationId, repositoryId);

      const name = input.name.trim();
      const parentNodeId = input.parentNodeId ?? null;
      if (parentNodeId) {
        const parent = await requireNode(organizationId, parentNodeId);
        if (parent.repositoryId !== repositoryId) {
          throw new ValidationAppError("Parent node is not in this repository");
        }
        if (parent.type !== "folder") {
          throw new ValidationAppError("Parent node must be a folder");
        }
      }
      await assertFolderDepth(organizationId, parentNodeId);
      await assertSiblingCapacity(
        organizationId,
        repositoryId,
        parentNodeId,
        name
      );

      return trees.createFolder(organizationId, {
        reference: nextReference("DOC"),
        repositoryId,
        name,
        parentNodeId,
        reviewDate: parseOptionalDate(input.reviewDate),
        createdBy: subjectId,
        createdOn: new Date(),
      });
    },

    async createFileNodes(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      input: CreateFileNodesInput
    ): Promise<CreateFileNodesResult> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      const repo = await requireRepository(organizationId, repositoryId);

      const parentNodeId = input.parentNodeId ?? null;
      if (parentNodeId) {
        const parent = await requireNode(organizationId, parentNodeId);
        if (parent.repositoryId !== repositoryId || parent.type !== "folder") {
          throw new ValidationAppError("Invalid parent folder");
        }
      }

      const created: DocumentTreeNode[] = [];
      const skipped: string[] = [];

      for (const item of input.data) {
        const storageInfo = normalizeFileMeta(item.storageInfo);
        const name = storageInfo.Name;
        const existing = await trees.findActiveByName(
          organizationId,
          repositoryId,
          parentNodeId,
          name,
          { status: ["Published", "Pending", "Rejected"] }
        );
        if (existing) {
          skipped.push(name);
          continue;
        }

        const authoriserIds = uniqueIds(item.authorisation ?? [], 50);
        const status = authoriserIds.length > 0 ? "Pending" : "Published";
        const owners = uniqueIds(
          [subjectId, ...repo.owners, ...(item.owners ?? [])],
          MAX_DOCUMENT_OWNERS
        );
        const threadId = randomUUID();

        const node = await trees.createDocument(organizationId, {
          reference: nextReference("DOC"),
          repositoryId,
          name,
          parentNodeId,
          status,
          documentData: {
            storageInfo,
            purpose: item.purpose ?? "Document",
            owners,
            applicableModules: [...new Set(item.applicableModules ?? [])],
            complianceTools: [...new Set(item.complianceTools ?? [])],
            complianceLinks: [],
            authorisation: authoriserIds.map((userId) => ({
              userId,
              status: "Pending" as const,
              handledOn: null,
              message: "",
            })),
            classification: "",
            dvID: status === "Published" ? 1 : 0,
            conformance: -1,
            threadId,
            reviewDate: parseOptionalDate(item.reviewDate),
          },
          createdBy: subjectId,
          createdOn: new Date(),
        });
        created.push(node);

        if (authoriserIds.length > 0) {
          await notifyUsers(
            organizationId,
            subjectId,
            authoriserIds,
            "Document authorisation requested",
            `Please authorise "${node.name}" (${node.reference}).`,
            node.id
          );
          await recordActivity(
            organizationId,
            node.id,
            `Authorisation requested for ${node.name}`,
            subjectId,
            threadId
          );
        } else {
          await recordActivity(
            organizationId,
            node.id,
            `Document ${node.name} published`,
            subjectId,
            threadId
          );
        }
      }

      return { created, skipped };
    },

    async listRepoNodes(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      query: ListRepoNodesQuery
    ): Promise<PaginatedDocumentNodes> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      await requireRepository(organizationId, repositoryId, {
        includeDeleted: query.deleted === true,
      });
      return trees.listChildren(organizationId, repositoryId, query);
    },

    async getNode(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string
    ): Promise<DocumentTreeNode> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      await requireRepository(organizationId, repositoryId);
      const node = await requireNode(organizationId, nodeId);
      if (node.repositoryId !== repositoryId) {
        throw new NotFoundError("Document node not found");
      }
      return node;
    },

    /** Version family of a document node (all statuses, oldest first). */
    async listNodeVersions(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string
    ): Promise<DocumentTreeNode[]> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      await requireRepository(organizationId, repositoryId);
      const node = await requireNode(organizationId, nodeId, {
        includeDeleted: true,
      });
      if (node.repositoryId !== repositoryId || node.type !== "document") {
        throw new NotFoundError("Document node not found");
      }
      const threadId = node.documentData?.threadId;
      if (!threadId) return [node];
      const family = await trees.listByThread(organizationId, threadId);
      return family.length > 0 ? family : [node];
    },

    async getNodePath(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string
    ): Promise<NodePathItem[]> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      await requireRepository(organizationId, repositoryId);
      const node = await requireNode(organizationId, nodeId);
      if (node.repositoryId !== repositoryId) {
        throw new NotFoundError("Document node not found");
      }
      return trees.buildPath(organizationId, nodeId);
    },

    async updateFolder(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string,
      input: UpdateFolderNodeInput
    ): Promise<DocumentTreeNode> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "update");
      await requireRepository(organizationId, repositoryId);
      const node = await requireNode(organizationId, nodeId);
      if (node.repositoryId !== repositoryId || node.type !== "folder") {
        throw new ValidationAppError("Node is not a folder in this repository");
      }

      const $set: Record<string, unknown> = {
        updatedBy: subjectId,
        updatedOn: new Date(),
        "folderData.modifiedBy": subjectId,
        "folderData.modifiedOn": new Date(),
      };
      if (input.name !== undefined) {
        const name = input.name.trim();
        if (name !== node.name) {
          await assertSiblingCapacity(
            organizationId,
            repositoryId,
            node.parentNodeId,
            name
          );
        }
        $set.name = name;
      }
      if (input.reviewDate !== undefined) {
        $set["folderData.reviewDate"] = parseOptionalDate(input.reviewDate);
      }

      const updated = await trees.updateOne(organizationId, nodeId, $set);
      if (!updated) throw new NotFoundError("Document node not found");
      return updated;
    },

    async updateDocument(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string,
      input: UpdateDocumentNodeInput
    ): Promise<DocumentTreeNode> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "update");
      await requireRepository(organizationId, repositoryId);
      const node = await requireNode(organizationId, nodeId);
      if (node.repositoryId !== repositoryId || node.type !== "document") {
        throw new ValidationAppError(
          "Node is not a document in this repository"
        );
      }

      const $set: Record<string, unknown> = {
        updatedBy: subjectId,
        updatedOn: new Date(),
      };
      if (input.purpose !== undefined) $set["documentData.purpose"] = input.purpose;
      if (input.owners !== undefined) {
        $set["documentData.owners"] = uniqueIds(
          input.owners,
          MAX_DOCUMENT_OWNERS
        );
      }
      if (input.applicableModules !== undefined) {
        $set["documentData.applicableModules"] = [
          ...new Set(input.applicableModules),
        ];
      }
      if (input.complianceTools !== undefined) {
        $set["documentData.complianceTools"] = [
          ...new Set(input.complianceTools),
        ];
      }
      if (input.reviewDate !== undefined) {
        $set["documentData.reviewDate"] = parseOptionalDate(input.reviewDate);
      }

      // Apply metadata to all versions in the family.
      await trees.updateManyByFamily(
        organizationId,
        {
          repositoryId: node.repositoryId,
          parentNodeId: node.parentNodeId,
          name: node.name,
        },
        $set
      );
      const updated = await trees.findById(organizationId, nodeId);
      if (!updated) throw new NotFoundError("Document node not found");
      return updated;
    },

    /**
     * Compliance Settings: link clause(s)/section to this document, select +
     * implement (including descendants for sections), and attach evidence.
     * Only one toolkit may be linked per document.
     */
    async applyComplianceClauses(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string,
      input: { toolkitId: string; clauseIds: string[] }
    ): Promise<DocumentTreeNode> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "update");
      await requireRepository(organizationId, repositoryId);
      const node = await requireNode(organizationId, nodeId);
      if (node.repositoryId !== repositoryId || node.type !== "document") {
        throw new ValidationAppError(
          "Node is not a document in this repository"
        );
      }
      if (!node.documentData) {
        throw new ValidationAppError("Document metadata is missing");
      }

      const toolkitId = input.toolkitId.trim();
      const clauseIds = [
        ...new Set(
          input.clauseIds.map((clause) => clause.trim()).filter(Boolean)
        ),
      ];
      if (!toolkitId) {
        throw new ValidationAppError("Toolkit is required");
      }
      if (clauseIds.length === 0) {
        throw new ValidationAppError("Select at least one clause or section");
      }

      const previousLinks = node.documentData.complianceLinks ?? [];
      if (
        previousLinks.length > 0 &&
        previousLinks.some((link) => link.toolkitId !== toolkitId)
      ) {
        throw new ValidationAppError(
          "This document is already linked to another compliance toolkit. Remove that link before selecting a different toolkit."
        );
      }

      const applied = await complianceLinks.applyClauses({
        organizationId,
        actorId: subjectId,
        documentId: node.id,
        toolkitId,
        clauseIds,
      });

      const existing =
        previousLinks.find((link) => link.toolkitId === toolkitId)?.clauseIds ??
        [];
      const nextClauseIds = [
        ...new Set([...existing, ...clauseIds, ...applied.appliedClauseIds]),
      ];
      const nextLinks = [{ toolkitId, clauseIds: nextClauseIds }];

      const updated = await trees.updateDocumentData(organizationId, nodeId, {
        complianceLinks: nextLinks,
      });
      if (!updated) throw new NotFoundError("Document node not found");

      try {
        await complianceLinks.syncLinks({
          organizationId,
          actorId: subjectId,
          documentId: node.id,
          previousLinks,
          nextLinks,
        });
      } catch {
        // Evidence sync is best-effort after apply already attached rows.
      }

      await activities.record({
        organizationId,
        moduleId: node.id,
        value: `Compliance linked: ${toolkitId} (${clauseIds.join(", ")})`,
        createdBy: subjectId,
        threadId: node.documentData.threadId || undefined,
      });

      return updated;
    },

    async clearComplianceLinks(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string
    ): Promise<DocumentTreeNode> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "update");
      await requireRepository(organizationId, repositoryId);
      const node = await requireNode(organizationId, nodeId);
      if (node.repositoryId !== repositoryId || node.type !== "document") {
        throw new ValidationAppError(
          "Node is not a document in this repository"
        );
      }

      const previousLinks = node.documentData?.complianceLinks ?? [];
      const updated = await trees.updateDocumentData(organizationId, nodeId, {
        complianceLinks: [],
      });
      if (!updated) throw new NotFoundError("Document node not found");

      try {
        await complianceLinks.clearLinks({
          organizationId,
          documentId: node.id,
        });
        await complianceLinks.syncLinks({
          organizationId,
          actorId: subjectId,
          documentId: node.id,
          previousLinks,
          nextLinks: [],
        });
      } catch {
        // Best-effort evidence cleanup.
      }

      return updated;
    },

    async addVersion(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string,
      input: AddVersionInput
    ): Promise<DocumentTreeNode> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      await requireRepository(organizationId, repositoryId);
      const published = await requireNode(organizationId, nodeId);
      if (
        published.repositoryId !== repositoryId ||
        published.type !== "document" ||
        published.status !== "Published"
      ) {
        throw new ValidationAppError(
          "No published version found for this document."
        );
      }

      const storageInfo = normalizeFileMeta(input.storageInfo);
      if (storageInfo.Name !== published.name) {
        throw new ValidationAppError(
          "Please upload a copy with same name and file type."
        );
      }

      const pending = await trees.findPendingByName(
        organizationId,
        repositoryId,
        published.parentNodeId,
        published.name
      );
      if (pending) {
        throw new ConflictError(
          "A pending authorisation already exists for this document."
        );
      }

      const authoriserIds = uniqueIds(input.authorisation ?? [], 50);
      const status = authoriserIds.length > 0 ? "Pending" : "Published";
      const base = published.documentData!;
      const owners = uniqueIds(
        [...(input.owners ?? base.owners), subjectId],
        MAX_DOCUMENT_OWNERS
      );

      const node = await trees.createDocument(organizationId, {
        reference: nextReference("DOC"),
        repositoryId,
        name: published.name,
        parentNodeId: published.parentNodeId,
        status,
        documentData: {
          storageInfo,
          purpose: base.purpose,
          owners,
          applicableModules: [...base.applicableModules],
          complianceTools: [...base.complianceTools],
          complianceLinks: [...(base.complianceLinks ?? [])],
          authorisation: authoriserIds.map((userId) => ({
            userId,
            status: "Pending" as const,
            handledOn: null,
            message: "",
          })),
          classification: base.classification,
          dvID: status === "Published" ? base.dvID + 1 : 0,
          conformance: -1,
          threadId: base.threadId || randomUUID(),
          reviewDate: base.reviewDate,
        },
        createdBy: subjectId,
        createdOn: new Date(),
      });

      if (status === "Published") {
        await trees.archivePublishedSibling(
          organizationId,
          repositoryId,
          published.parentNodeId,
          published.name,
          node.id
        );
      }

      await recordActivity(
        organizationId,
        node.id,
        `New version added for ${node.name}`,
        subjectId,
        node.documentData?.threadId
      );
      if (authoriserIds.length > 0) {
        await notifyUsers(
          organizationId,
          subjectId,
          authoriserIds,
          "Document authorisation requested",
          `Please authorise new version of "${node.name}".`,
          node.id
        );
      }
      return node;
    },

    async addRevision(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string,
      input: AddRevisionInput
    ): Promise<DocumentTreeNode> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      await requireRepository(organizationId, repositoryId);
      const node = await requireNode(organizationId, nodeId);
      if (
        node.repositoryId !== repositoryId ||
        node.type !== "document" ||
        node.status !== "Pending"
      ) {
        throw new ValidationAppError(
          "This node is not allowed to have any revision"
        );
      }

      const storageInfo = normalizeFileMeta(input.storageInfo);
      if (storageInfo.Name !== node.name) {
        throw new ValidationAppError("This file is not with same name");
      }

      const previous = node.documentData?.storageInfo;
      const updated = await trees.updateOne(organizationId, nodeId, {
        "documentData.storageInfo": storageInfo,
        updatedBy: subjectId,
        updatedOn: new Date(),
      });
      if (!updated) throw new NotFoundError("Document node not found");

      if (previous) {
        try {
          await files.deleteStoredFile(previous);
        } catch {
          // Non-fatal.
        }
      }

      await recordActivity(
        organizationId,
        node.id,
        `Revision added for ${node.name}`,
        subjectId,
        node.documentData?.threadId
      );
      return updated;
    },

    async moveNode(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string,
      input: MoveNodeInput
    ): Promise<DocumentTreeNode> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      await requireRepository(organizationId, repositoryId);
      const node = await requireNode(organizationId, nodeId);
      if (node.repositoryId !== repositoryId) {
        throw new NotFoundError("Document node not found");
      }

      const parentNodeId = input.parentNodeId ?? null;
      if (parentNodeId) {
        const parent = await requireNode(organizationId, parentNodeId);
        if (parent.repositoryId !== repositoryId || parent.type !== "folder") {
          throw new ValidationAppError("Invalid target folder");
        }
        if (parent.id === node.id) {
          throw new ValidationAppError("Cannot move a node into itself");
        }
      }
      await assertFolderDepth(organizationId, parentNodeId);

      if (parentNodeId !== node.parentNodeId) {
        const clash = await trees.findActiveByName(
          organizationId,
          repositoryId,
          parentNodeId,
          node.name
        );
        if (clash) {
          throw new ConflictError(
            `A folder or document named "${node.name}" already exists at the target location`
          );
        }
      }

      await trees.moveFamily(organizationId, node, parentNodeId, subjectId);
      return requireNode(organizationId, nodeId);
    },

    async changeRepository(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string,
      input: ChangeRepositoryInput
    ): Promise<DocumentTreeNode> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      await requireRepository(organizationId, repositoryId);
      const node = await requireNode(organizationId, nodeId);
      if (node.repositoryId !== repositoryId) {
        throw new NotFoundError("Document node not found");
      }
      const targetId = input.repositoryId;
      await requireRepository(organizationId, targetId);
      const parentNodeId = input.parentNodeId ?? null;
      if (parentNodeId) {
        const parent = await requireNode(organizationId, parentNodeId);
        if (parent.repositoryId !== targetId || parent.type !== "folder") {
          throw new ValidationAppError("Invalid target folder");
        }
      }

      const clash = await trees.findActiveByName(
        organizationId,
        targetId,
        parentNodeId,
        node.name
      );
      if (clash) {
        throw new ConflictError(
          `A folder or document named "${node.name}" already exists in the target repository`
        );
      }

      await trees.changeRepositoryForFamily(
        organizationId,
        node,
        targetId,
        parentNodeId,
        subjectId
      );
      return requireNode(organizationId, nodeId);
    },

    async softDeleteNode(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string
    ): Promise<{ id: string; movedToBin: true }> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "delete");
      await requireRepository(organizationId, repositoryId);
      const node = await requireNode(organizationId, nodeId);
      if (node.repositoryId !== repositoryId) {
        throw new NotFoundError("Document node not found");
      }

      const binList = await trees.listChildren(organizationId, repositoryId, {
        page: 1,
        pageSize: 20,
        parentNodeId: node.parentNodeId,
        deleted: true,
        search: node.name,
      });
      const deletedSameName = binList.items.find(
        (item) => item.name === node.name && item.status === "Published"
      );
      if (deletedSameName) {
        throw new ConflictError(
          "Cannot soft-delete: a published item with this name already sits in the bin"
        );
      }

      await trees.softDeleteFamily(organizationId, node, subjectId);
      return { id: nodeId, movedToBin: true };
    },

    async restoreNode(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string
    ): Promise<DocumentTreeNode> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      await requireRepository(organizationId, repositoryId);
      const node = await requireNode(organizationId, nodeId, {
        includeDeleted: true,
      });
      if (node.repositoryId !== repositoryId || !node.deletedAt) {
        throw new NotFoundError("Deleted document node not found");
      }

      const live = await trees.findActiveByName(
        organizationId,
        repositoryId,
        node.parentNodeId,
        node.name,
        { status: "Published" }
      );
      if (live) {
        throw new ConflictError(
          "Cannot restore: a published copy already exists in the live folder"
        );
      }

      await trees.restoreFamily(organizationId, node, subjectId);
      return requireNode(organizationId, nodeId);
    },

    async hardDeleteNode(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string
    ): Promise<{ id: string; deleted: true }> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "delete");
      await requireRepository(organizationId, repositoryId, {
        includeDeleted: true,
      });
      const node = await requireNode(organizationId, nodeId, {
        includeDeleted: true,
      });
      if (node.repositoryId !== repositoryId) {
        throw new NotFoundError("Document node not found");
      }

      // Hard-delete the whole name family at that location.
      const family = await trees.listChildren(organizationId, repositoryId, {
        page: 1,
        pageSize: 200,
        parentNodeId: node.parentNodeId,
        deleted: node.deletedAt != null,
        search: node.name,
      });
      const targets = family.items.filter((item) => item.name === node.name);
      const toDelete =
        targets.length > 0
          ? targets
          : [node];

      for (const item of toDelete) {
        if (item.documentData?.storageInfo) {
          try {
            await files.deleteStoredFile(item.documentData.storageInfo);
          } catch {
            // continue
          }
        }
        await trees.hardDeleteById(organizationId, item.id);
      }
      return { id: nodeId, deleted: true };
    },

    async addAuthoriser(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string,
      userId: string
    ): Promise<DocumentTreeNode> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      await requireRepository(organizationId, repositoryId);
      const node = await requireNode(organizationId, nodeId);
      if (
        node.repositoryId !== repositoryId ||
        node.type !== "document" ||
        node.status !== "Pending"
      ) {
        throw new ValidationAppError(
          "Authorisers can only be added on Pending documents"
        );
      }
      const auth = node.documentData?.authorisation ?? [];
      if (auth.some((entry) => entry.userId === userId)) {
        throw new ConflictError("Authoriser already assigned");
      }

      const updated = await trees.updateOne(organizationId, nodeId, {
        "documentData.authorisation": [
          ...auth.map((entry) => ({
            ...(entry.id ? { _id: entry.id } : {}),
            userId: entry.userId,
            status: entry.status,
            handledOn: entry.handledOn,
            message: entry.message,
          })),
          {
            userId,
            status: "Pending",
            handledOn: null,
            message: "",
          },
        ],
        updatedBy: subjectId,
        updatedOn: new Date(),
      });
      if (!updated) throw new NotFoundError("Document node not found");

      await notifyUsers(
        organizationId,
        subjectId,
        [userId],
        "Document authorisation requested",
        `Please authorise "${node.name}".`,
        node.id
      );
      return updated;
    },

    async removeAuthoriser(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string,
      authorisationId: string
    ): Promise<DocumentTreeNode> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      await requireRepository(organizationId, repositoryId);
      const node = await requireNode(organizationId, nodeId);
      if (
        node.repositoryId !== repositoryId ||
        node.type !== "document" ||
        node.status !== "Pending"
      ) {
        throw new ValidationAppError(
          "Authorisers can only be removed on Pending documents"
        );
      }
      const next = (node.documentData?.authorisation ?? []).filter(
        (entry) => entry.id !== authorisationId
      );
      if (next.length === (node.documentData?.authorisation ?? []).length) {
        throw new NotFoundError("Authorisation entry not found");
      }

      const updated = await trees.updateOne(organizationId, nodeId, {
        "documentData.authorisation": next.map((entry) => ({
          ...(entry.id ? { _id: entry.id } : {}),
          userId: entry.userId,
          status: entry.status,
          handledOn: entry.handledOn,
          message: entry.message,
        })),
        updatedBy: subjectId,
        updatedOn: new Date(),
      });
      if (!updated) throw new NotFoundError("Document node not found");
      return updated;
    },

    async decideAuthorisation(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string,
      authorisationId: string,
      input: DecideAuthorisationInput
    ): Promise<DocumentTreeNode> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      await requireRepository(organizationId, repositoryId);
      const node = await requireNode(organizationId, nodeId);
      if (
        node.repositoryId !== repositoryId ||
        node.type !== "document" ||
        node.status !== "Pending"
      ) {
        throw new ValidationAppError("Document is not pending authorisation");
      }

      const auth = [...(node.documentData?.authorisation ?? [])];
      const index = auth.findIndex((entry) => entry.id === authorisationId);
      if (index < 0) throw new NotFoundError("Authorisation entry not found");
      const currentEntry = auth[index];
      if (!currentEntry) {
        throw new NotFoundError("Authorisation entry not found");
      }
      if (currentEntry.userId !== subjectId) {
        throw new ForbiddenError(
          "Only the assigned authoriser can decide this request"
        );
      }
      if (currentEntry.status !== "Pending") {
        throw new ConflictError("Authorisation already decided");
      }

      auth[index] = {
        id: currentEntry.id,
        userId: currentEntry.userId,
        status: input.status,
        handledOn: new Date(),
        message: input.message?.trim() ?? "",
      };

      let nextStatus: "Pending" | "Published" | "Rejected" = "Pending";
      if (input.status === "Rejected") {
        nextStatus = "Rejected";
      } else if (auth.every((entry) => entry.status === "Approved")) {
        nextStatus = "Published";
      }

      const $set: Record<string, unknown> = {
        status: nextStatus,
        "documentData.authorisation": auth.map((entry) => ({
          ...(entry.id ? { _id: entry.id } : {}),
          userId: entry.userId,
          status: entry.status,
          handledOn: entry.handledOn,
          message: entry.message,
        })),
        updatedBy: subjectId,
        updatedOn: new Date(),
      };

      if (nextStatus === "Published") {
        const currentDv = node.documentData?.dvID ?? 0;
        const siblings = await trees.listChildren(
          organizationId,
          repositoryId,
          {
            page: 1,
            pageSize: 50,
            parentNodeId: node.parentNodeId,
            search: node.name,
          }
        );
        const maxDv = siblings.items
          .filter(
            (item) =>
              item.name === node.name &&
              item.type === "document" &&
              item.status === "Published"
          )
          .reduce(
            (max, item) => Math.max(max, item.documentData?.dvID ?? 0),
            currentDv
          );
        $set["documentData.dvID"] = maxDv + 1;
      }

      const updated = await trees.updateOne(organizationId, nodeId, $set);
      if (!updated) throw new NotFoundError("Document node not found");

      if (nextStatus === "Published") {
        await trees.archivePublishedSibling(
          organizationId,
          repositoryId,
          node.parentNodeId,
          node.name,
          node.id
        );
      }

      await recordActivity(
        organizationId,
        node.id,
        `Authorisation ${input.status.toLowerCase()} for ${node.name}`,
        subjectId,
        node.documentData?.threadId
      );
      await notifyUsers(
        organizationId,
        subjectId,
        node.documentData?.owners ?? [],
        `Document authorisation ${input.status.toLowerCase()}`,
        `"${node.name}" was ${input.status.toLowerCase()} by an authoriser.`,
        node.id
      );
      return updated;
    },

    async listPublishedDocuments(
      identity: SecurityIdentity | null | undefined,
      query: ListPublishedDocumentsQuery
    ): Promise<PaginatedDocumentNodes> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      return trees.listPublished(organizationId, query);
    },

    async getPublishedDocumentForOrganization(
      organizationId: string,
      id: string
    ): Promise<DocumentTreeNode | null> {
      const node = await trees.findById(organizationId, id);
      if (!node || node.type !== "document" || node.status !== "Published") {
        return null;
      }
      return node;
    },

    /**
     * Resolve a document tree node by id (any status) for deep-links from
     * compliance evidence and similar cross-module references.
     */
    async getDocumentTreeNode(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<DocumentTreeNode> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const node = await trees.findById(organizationId, id);
      if (!node || node.type !== "document") {
        throw new NotFoundError("Document not found");
      }
      return node;
    },

    async listPublishedForOrganization(
      organizationId: string,
      query: ListPublishedDocumentsQuery
    ): Promise<PaginatedDocumentNodes> {
      return trees.listPublished(organizationId, query);
    },

    /**
     * Share a document by email (spec §2): creates a 2-day limited-access
     * token per recipient; the emailed link resolves (via
     * resolveShareToken) to a fresh signed view URL.
     */
    async shareDocument(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string,
      input: { emails: string[]; message?: string }
    ): Promise<{ sharedWith: string[]; expiresAt: Date }> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      await requireRepository(organizationId, repositoryId);
      const node = await requireNode(organizationId, nodeId);
      if (node.repositoryId !== repositoryId || node.type !== "document") {
        throw new NotFoundError("Document node not found");
      }
      if (!node.documentData?.storageInfo) {
        throw new ValidationAppError("Document has no stored file to share");
      }

      const emails = [...new Set(input.emails.map((e) => e.toLowerCase()))];
      const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

      for (const email of emails) {
        const rawToken = generateAccessToken();
        await accessTokens.create({
          organizationId,
          documentNodeId: node.id,
          purpose: "share",
          rawToken,
          recipientEmail: email,
          createdBy: subjectId,
          expiresAt,
        });
        const link = `${accessLinkBaseUrl}/api/v1/document-shares/${rawToken}`;
        if (deps.email) {
          try {
            const rendered = renderEmail(
              "document-shared",
              {
                documentName: node.name,
                ...(input.message ? { message: input.message } : {}),
                viewUrl: link,
              },
              { branding: await brandingFor(organizationId) }
            );
            await deps.email.sendDocumentEmail({
              to: [email],
              subject: rendered.subject,
              text: rendered.text,
              html: rendered.html,
              organizationId,
            });
          } catch {
            // Non-fatal — token exists; sender can share the link again.
          }
        }
      }

      await recordActivity(
        organizationId,
        node.id,
        `Document shared via email with ${emails.join(", ")}`,
        subjectId,
        node.documentData?.threadId
      );
      return { sharedWith: emails, expiresAt };
    },

    /** Public: resolve a share token to a fresh signed view URL. */
    async resolveShareToken(rawToken: string): Promise<string> {
      const record = await accessTokens.findByRawToken(rawToken);
      if (
        !record ||
        record.purpose !== "share" ||
        record.invalidatedAt ||
        record.expiresAt.getTime() < Date.now()
      ) {
        throw new NotFoundError("Share link is invalid or has expired");
      }
      const node = await trees.findById(
        record.organizationId,
        record.documentNodeId,
        { includeDeleted: true }
      );
      if (!node?.documentData?.storageInfo || node.deletedAt) {
        throw new NotFoundError("Shared document is no longer available");
      }
      await accessTokens.markUsed(record.id);
      return files.createViewUrl(node.documentData.storageInfo);
    },

    // -----------------------------------------------------------------
    // Electronic signatures (spec §2/§10, full parity epic)
    // -----------------------------------------------------------------

    async inviteSignatures(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string,
      input: InviteSignaturesInput
    ): Promise<DocumentSignature[]> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      await requireRepository(organizationId, repositoryId);
      const node = await requireNode(organizationId, nodeId);
      if (node.repositoryId !== repositoryId || node.type !== "document") {
        throw new NotFoundError("Document node not found");
      }
      if (node.status !== "Published") {
        throw new ValidationAppError(
          "Only published documents can be sent for signature"
        );
      }
      if (!input.signatureLocations?.length) {
        throw new ValidationAppError(
          "At least one signature location is required"
        );
      }

      const created: DocumentSignature[] = [];
      const internalUsers = input.internalUsers ?? [];
      for (const user of internalUsers) {
        const record = await signatures.create({
          organizationId,
          repositoryId,
          documentNodeId: node.id,
          inviteeType: "user",
          userId: user.userId,
          email: user.email,
          displayName: user.displayName,
          message: input.message ?? "",
          status: "Pending",
          signatureLocations: input.signatureLocations,
          lastOpenedAt: null,
          signedAt: null,
          createdBy: subjectId,
        });
        created.push(record);
        await notifyUsers(
          organizationId,
          subjectId,
          [user.userId],
          "Signature requested",
          `You have been invited to sign "${node.name}".`,
          node.id
        );
        if (user.email && deps.email) {
          try {
            const rendered = renderEmail(
              "document-signature-requested",
              { documentName: node.name },
              { branding: await brandingFor(organizationId) }
            );
            await deps.email.sendDocumentEmail({
              to: [user.email],
              subject: rendered.subject,
              text: rendered.text,
              html: rendered.html,
              organizationId,
            });
          } catch {
            // Non-fatal.
          }
        }
      }

      for (const email of input.externalEmails ?? []) {
        const record = await signatures.create({
          organizationId,
          repositoryId,
          documentNodeId: node.id,
          inviteeType: "email",
          email,
          displayName: email,
          message: input.message ?? "",
          status: "Pending",
          signatureLocations: input.signatureLocations,
          lastOpenedAt: null,
          signedAt: null,
          createdBy: subjectId,
        });
        created.push(record);
        await sendExternalInviteEmail(record, node.name, node.id);
      }

      if (created.length === 0) {
        throw new ValidationAppError(
          "Select at least one internal user or external email"
        );
      }

      await recomputeConformance(organizationId, node);
      await recordActivity(
        organizationId,
        node.id,
        `Signature requested for ${node.name} (${created.length} invitee(s))`,
        subjectId,
        node.documentData?.threadId
      );
      return created;
    },

    async listSignatures(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string
    ): Promise<DocumentSignature[]> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      await requireRepository(organizationId, repositoryId);
      const node = await requireNode(organizationId, nodeId);
      if (node.repositoryId !== repositoryId) {
        throw new NotFoundError("Document node not found");
      }
      return signatures.listByNode(organizationId, nodeId);
    },

    async resendSignature(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string,
      signatureId: string
    ): Promise<DocumentSignature> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const record = await signatures.findById(organizationId, signatureId);
      if (!record || record.documentNodeId !== nodeId) {
        throw new NotFoundError("Signature request not found");
      }
      const node = await requireNode(organizationId, nodeId);
      if (record.inviteeType === "email" && record.email) {
        await accessTokens.invalidateForSignature(record.id);
        await sendExternalInviteEmail(record, node.name, node.id);
      } else if (record.userId) {
        await notifyUsers(
          organizationId,
          subjectId,
          [record.userId],
          "Signature requested (resent)",
          `Reminder: you have been invited to sign "${node.name}".`,
          node.id
        );
      }
      return record;
    },

    async removeSignature(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string,
      signatureId: string
    ): Promise<{ id: string; deleted: true }> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const record = await signatures.findById(organizationId, signatureId);
      if (!record || record.documentNodeId !== nodeId) {
        throw new NotFoundError("Signature request not found");
      }
      await accessTokens.invalidateForSignature(record.id);
      await signatures.deleteById(organizationId, record.id);
      const node = await trees.findById(organizationId, nodeId, {
        includeDeleted: true,
      });
      if (node) await recomputeConformance(organizationId, node);
      return { id: signatureId, deleted: true };
    },

    async listPreservedReviewers(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string
    ): Promise<Array<{ inviteeType: "user" | "email"; userId?: string; email?: string; displayName: string }>> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      await requireRepository(organizationId, repositoryId);
      const all = await signatures.listByNode(organizationId, nodeId);
      const seen = new Map<string, { inviteeType: "user" | "email"; userId?: string; email?: string; displayName: string }>();
      for (const row of all) {
        const key = row.inviteeType === "user" ? `user:${row.userId}` : `email:${row.email}`;
        if (!seen.has(key)) {
          seen.set(key, {
            inviteeType: row.inviteeType,
            userId: row.userId,
            email: row.email,
            displayName: row.displayName,
          });
        }
      }
      return [...seen.values()];
    },

    async listSignatureRequests(
      identity: SecurityIdentity | null | undefined,
      query: { mine?: boolean; status?: DocumentSignature["status"] }
    ): Promise<DocumentSignature[]> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      return signatures.listForOrganization(organizationId, {
        userId: query.mine ? subjectId : undefined,
        status: query.status,
      });
    },

    /** Internal signing (invitee must be the logged-in user). */
    async signDocument(
      identity: SecurityIdentity | null | undefined,
      repositoryId: string,
      nodeId: string,
      signatureId: string,
      input: SignDocumentInput
    ): Promise<DocumentSignature> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const record = await signatures.findById(organizationId, signatureId);
      if (!record || record.documentNodeId !== nodeId) {
        throw new NotFoundError("Signature request not found");
      }
      if (record.inviteeType !== "user" || record.userId !== subjectId) {
        throw new ForbiddenError(
          "Only the invited user can sign this request"
        );
      }
      return applySignature(record, input);
    },

    /** Public: context for an external signing link (marks opened). */
    async getPublicSignatureContext(rawToken: string): Promise<{
      signature: DocumentSignature;
      documentName: string;
      repositoryId: string;
    }> {
      const { record, signature } = await requireSignatureToken(rawToken);
      await signatures.update(signature.organizationId, signature.id, {
        lastOpenedAt: new Date(),
      });
      const node = await trees.findById(
        record.organizationId,
        record.documentNodeId,
        { includeDeleted: true }
      );
      if (!node || node.deletedAt) {
        throw new NotFoundError("Document is no longer available");
      }
      return {
        signature,
        documentName: node.name,
        repositoryId: node.repositoryId,
      };
    },

    /** Public: external signing via token; token invalidated after use. */
    async signDocumentPublic(
      rawToken: string,
      input: SignDocumentInput
    ): Promise<DocumentSignature> {
      const { record, signature } = await requireSignatureToken(rawToken);
      const updated = await applySignature(signature, input);
      await accessTokens.invalidate(record.id);
      return updated;
    },
  };

  async function sendExternalInviteEmail(
    record: DocumentSignature,
    documentName: string,
    _nodeId: string
  ): Promise<void> {
    if (!deps.email || !record.email) return;
    const rawToken = generateAccessToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await accessTokens.create({
      organizationId: record.organizationId,
      documentNodeId: record.documentNodeId,
      signatureId: record.id,
      purpose: "signature",
      rawToken,
      recipientEmail: record.email,
      createdBy: record.createdBy,
      expiresAt,
    });
    const link = `${accessLinkBaseUrl}/documents/sign/${rawToken}`;
    try {
      const rendered = renderEmail(
        "document-signature-requested",
        {
          documentName,
          ...(record.message ? { message: record.message } : {}),
          signUrl: link,
          expiresAt,
        },
        { branding: await brandingFor(record.organizationId) }
      );
      await deps.email.sendDocumentEmail({
        to: [record.email],
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        organizationId: record.organizationId,
      });
    } catch {
      // Non-fatal — resend can issue a fresh link.
    }
  }

  async function requireSignatureToken(rawToken: string): Promise<{
    record: Awaited<ReturnType<DocumentAccessTokenStore["findByRawToken"]>> & object;
    signature: DocumentSignature;
  }> {
    const record = await accessTokens.findByRawToken(rawToken);
    if (
      !record ||
      record.purpose !== "signature" ||
      !record.signatureId ||
      record.invalidatedAt ||
      record.expiresAt.getTime() < Date.now()
    ) {
      throw new NotFoundError("Signature link is invalid or has expired");
    }
    const signature = await signatures.findByIdAnyOrg(record.signatureId);
    if (!signature || signature.organizationId !== record.organizationId) {
      throw new NotFoundError("Signature request not found");
    }
    if (signature.status === "Signed") {
      throw new ValidationAppError("This document has already been signed");
    }
    return { record, signature };
  }

  async function recomputeConformance(
    organizationId: string,
    node: DocumentTreeNode
  ): Promise<void> {
    const all = await signatures.listByNode(organizationId, node.id);
    const conformance =
      all.length === 0
        ? -1
        : Math.floor(
            (all.filter((s) => s.status === "Signed").length / all.length) *
              100
          );
    await trees.updateDocumentData(organizationId, node.id, { conformance });
    if (conformance === 100) {
      await recordActivity(
        organizationId,
        node.id,
        `Document ${node.name} reached full signature conformance`,
        node.createdBy,
        node.documentData?.threadId
      );
      await notifyUsers(
        organizationId,
        node.createdBy,
        node.documentData?.owners ?? [],
        "Document fully signed",
        `"${node.name}" has been signed by all invitees (100% conformance).`,
        node.id
      );
    }
  }

  async function applySignature(
    record: DocumentSignature,
    input: SignDocumentInput
  ): Promise<DocumentSignature> {
    if (record.status === "Signed") {
      throw new ValidationAppError("This document has already been signed");
    }
    const node = await trees.findById(record.organizationId, record.documentNodeId, {
      includeDeleted: true,
    });
    if (!node?.documentData?.storageInfo || node.deletedAt) {
      throw new NotFoundError("Document is no longer available");
    }
    const signedAt = new Date();
    const original = await files.readStoredFile(
      node.documentData.storageInfo
    );
    const stamped = await stampSignaturePdf(original, {
      name: input.name,
      jobTitle: input.jobTitle,
      organisation: input.organisation,
      locations: record.signatureLocations,
      signedAt,
    });
    const signedCopy = await files.writeStoredFile({
      fileName: node.name.replace(/\.pdf$/i, "") + "-signed.pdf",
      bucket: node.documentData.storageInfo.Bucket,
      contentType: "application/pdf",
      body: stamped,
    });

    const updated = await signatures.update(record.organizationId, record.id, {
      status: "Signed",
      signatureName: input.name,
      signatureFont: input.font ?? "cursive",
      jobTitle: input.jobTitle,
      organisation: input.organisation,
      signedCopy,
      signedAt,
      lastOpenedAt: new Date(),
    });
    if (!updated) throw new NotFoundError("Signature request not found");

    await recomputeConformance(record.organizationId, node);
    await recordActivity(
      record.organizationId,
      node.id,
      `Document ${node.name} signed by ${record.displayName}`,
      record.createdBy,
      node.documentData?.threadId
    );
    await notifyUsers(
      record.organizationId,
      record.createdBy,
      node.documentData?.owners ?? [],
      "Document signed",
      `"${node.name}" was signed by ${record.displayName}.`,
      node.id
    );

    // Signed-copy email to the signee when we have an address.
    if (deps.email && record.email) {
      try {
        const viewUrl = await files.createViewUrl(signedCopy);
        const rendered = renderEmail(
          "document-signed-copy",
          {
            documentName: node.name,
            viewUrl,
          },
          { branding: await brandingFor(record.organizationId) }
        );
        await deps.email.sendDocumentEmail({
          to: [record.email],
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
          organizationId: record.organizationId,
        });
      } catch {
        // Non-fatal.
      }
    }
    return updated;
  }
}
