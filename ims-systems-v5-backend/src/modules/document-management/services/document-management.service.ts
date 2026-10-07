/**
 * Document Management application service.
 * Spec: docs/module-specifications/document-management.md
 *
 * Foundation: repositories, folders/documents, versions, authorisation,
 * recycle bin, overview, published picker. Signatures / share email / cron later.
 */

import { randomUUID } from "node:crypto";
import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import type {
  DocumentActivityPort,
  DocumentFilesPort,
  DocumentNotificationPort,
} from "../ports";
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
  type CreateFileNodesInput,
  type CreateFileNodesResult,
  type CreateFolderNodeInput,
  type DecideAuthorisationInput,
  type DocumentOverviewCounts,
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
};

export function createDocumentManagementService(
  deps: DocumentManagementServiceDeps
) {
  const { repositories, trees, authorizer, files, activities, notifications } =
    deps;

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

  async function copyFoldersRecursive(
    organizationId: string,
    sourceRepoId: string,
    targetRepoId: string,
    subjectId: string,
    sourceParentId: string | null,
    targetParentId: string | null
  ): Promise<void> {
    const children = await trees.listChildren(organizationId, sourceRepoId, {
      page: 1,
      pageSize: 200,
      parentNodeId: sourceParentId,
      type: "folder",
      sort: "name",
      sortDir: "asc",
    });

    for (const folder of children.items) {
      const created = await trees.createFolder(organizationId, {
        reference: nextReference("DOC"),
        repositoryId: targetRepoId,
        name: folder.name,
        parentNodeId: targetParentId,
        reviewDate: folder.folderData?.reviewDate ?? null,
        createdBy: subjectId,
        createdOn: new Date(),
      });
      await copyFoldersRecursive(
        organizationId,
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
      await requireRepository(organizationId, input.sourceRepoId);
      await copyFoldersRecursive(
        organizationId,
        input.sourceRepoId,
        repositoryId,
        subjectId,
        null,
        null
      );
      return { copied: true };
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

    async listPublishedForOrganization(
      organizationId: string,
      query: ListPublishedDocumentsQuery
    ): Promise<PaginatedDocumentNodes> {
      return trees.listPublished(organizationId, query);
    },
  };
}
