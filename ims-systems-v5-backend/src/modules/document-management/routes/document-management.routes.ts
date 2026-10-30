import { Router } from "express";
import type { Authorizer } from "../../../security";
import { createDocumentManagementController } from "../controllers/document-management.controller";
import {
  NoOpDocumentActivityAdapter,
  NoOpDocumentComplianceLinkAdapter,
  NoOpDocumentEmailAdapter,
  NoOpDocumentFilesAdapter,
  NoOpDocumentNotificationAdapter,
  type DocumentActivityPort,
  type DocumentComplianceLinkPort,
  type DocumentEmailPort,
  type DocumentFilesPort,
  type DocumentMembershipPort,
  type DocumentNotificationPort,
} from "../ports";
import { createDocumentRepositoryStore } from "../repositories/document-repository.repository";
import { createDocumentTreeStore } from "../repositories/document-tree.repository";
import type { OnlyOfficeRuntimeConfig } from "../lib/onlyoffice";
import {
  createDocumentManagementService,
  type DocumentManagementApplicationPort,
  type DocumentManagementService,
  type DocumentManagementServiceDeps,
} from "../services/document-management.service";
import {
  createDocumentReviewReminderService,
  type DocumentReviewReminderService,
} from "../services/document-review-reminder.service";

export type DocumentManagementRouterDeps = {
  authorizer: Authorizer;
  files?: DocumentFilesPort;
  activities?: DocumentActivityPort;
  notifications?: DocumentNotificationPort;
  email?: DocumentEmailPort;
  memberships?: DocumentMembershipPort;
  complianceLinks?: DocumentComplianceLinkPort;
  /** Base URL for emailed access links (share / signature). */
  accessLinkBaseUrl?: string;
  resolveEmailBranding?: DocumentManagementServiceDeps["resolveEmailBranding"];
  onlyOffice?: OnlyOfficeRuntimeConfig;
};

/**
 * Compose Document Management module.
 *
 * Mounted as:
 * - /api/v1/document-management  (overview)
 * - /api/v1/document-repositories
 * - /api/v1/document-trees       (org-wide published picker)
 */
export function createDocumentManagementModule(
  deps: DocumentManagementRouterDeps
): {
  service: DocumentManagementService;
  application: DocumentManagementApplicationPort;
  reviewReminders: DocumentReviewReminderService;
  managementRouter: Router;
  repositoriesRouter: Router;
  treesRouter: Router;
  sharesRouter: Router;
  signaturesRouter: Router;
} {
  const repositories = createDocumentRepositoryStore();
  const trees = createDocumentTreeStore();
  const notificationsPort =
    deps.notifications ?? new NoOpDocumentNotificationAdapter();
  const service = createDocumentManagementService({
    repositories,
    trees,
    authorizer: deps.authorizer,
    files: deps.files ?? new NoOpDocumentFilesAdapter(),
    activities: deps.activities ?? new NoOpDocumentActivityAdapter(),
    notifications: notificationsPort,
    email: deps.email ?? new NoOpDocumentEmailAdapter(),
    memberships: deps.memberships,
    complianceLinks:
      deps.complianceLinks ?? new NoOpDocumentComplianceLinkAdapter(),
    accessLinkBaseUrl: deps.accessLinkBaseUrl,
    resolveEmailBranding: deps.resolveEmailBranding,
    onlyOffice: deps.onlyOffice,
  });
  const reviewReminders = createDocumentReviewReminderService({
    trees,
    notifications: notificationsPort,
  });
  const controller = createDocumentManagementController(service);

  const managementRouter = Router();
  managementRouter.get("/overview", controller.overview);

  const repositoriesRouter = Router();
  // Static segment must be registered before "/:id".
  repositoriesRouter.get(
    "/cross-org-copy-sources",
    controller.listCrossOrgCopySources
  );
  repositoriesRouter.get("/", controller.listRepositories);
  repositoriesRouter.post("/", controller.createRepository);
  repositoriesRouter.get("/:id", controller.getRepository);
  repositoriesRouter.put("/:id", controller.updateRepository);
  repositoriesRouter.delete("/:id/soft", controller.softDeleteRepository);
  repositoriesRouter.delete("/:id/hard", controller.hardDeleteRepository);
  repositoriesRouter.put("/:id/restore", controller.restoreRepository);

  repositoriesRouter.post(
    "/:id/copy-folder-structure",
    controller.copyFolderStructure
  );
  repositoriesRouter.post("/:id/folder-nodes", controller.createFolder);
  repositoriesRouter.post("/:id/file-nodes", controller.createFiles);
  repositoriesRouter.get("/:id/nodes", controller.listNodes);
  repositoriesRouter.get("/:id/nodes/:nodeId", controller.getNode);
  repositoriesRouter.get(
    "/:id/nodes/:nodeId/versions",
    controller.listNodeVersions
  );
  repositoriesRouter.get("/:id/nodes/:nodeId/path", controller.getNodePath);
  repositoriesRouter.put(
    "/:id/folder-nodes/:nodeId",
    controller.updateFolder
  );
  repositoriesRouter.put(
    "/:id/file-nodes/:nodeId",
    controller.updateDocument
  );
  repositoriesRouter.post(
    "/:id/file-nodes/:nodeId/compliance-apply",
    controller.applyComplianceClauses
  );
  repositoriesRouter.delete(
    "/:id/file-nodes/:nodeId/compliance-links",
    controller.clearComplianceLinks
  );
  repositoriesRouter.post(
    "/:id/nodes/:nodeId/new-version",
    controller.addVersion
  );
  repositoriesRouter.put(
    "/:id/nodes/:nodeId/revision",
    controller.addRevision
  );
  repositoriesRouter.post(
    "/:id/nodes/:nodeId/editor-session",
    controller.createEditorSession
  );
  repositoriesRouter.post(
    "/:id/nodes/:nodeId/editor-callback",
    controller.editorCallback
  );
  repositoriesRouter.put("/:id/nodes/:nodeId/move-node", controller.moveNode);
  repositoriesRouter.put(
    "/:id/nodes/:nodeId/change-repository",
    controller.changeRepository
  );
  repositoriesRouter.put("/:id/nodes/:nodeId/restore", controller.restoreNode);
  repositoriesRouter.delete(
    "/:id/nodes/:nodeId/soft",
    controller.softDeleteNode
  );
  repositoriesRouter.delete(
    "/:id/nodes/:nodeId/hard",
    controller.hardDeleteNode
  );

  repositoriesRouter.post(
    "/:id/nodes/:nodeId/share",
    controller.shareDocument
  );
  repositoriesRouter.post(
    "/:id/nodes/:nodeId/signatures",
    controller.inviteSignatures
  );
  repositoriesRouter.get(
    "/:id/nodes/:nodeId/signatures",
    controller.listSignatures
  );
  repositoriesRouter.get(
    "/:id/nodes/:nodeId/preserved-reviewers",
    controller.listPreservedReviewers
  );
  repositoriesRouter.post(
    "/:id/nodes/:nodeId/signatures/:signatureId/resend",
    controller.resendSignature
  );
  repositoriesRouter.delete(
    "/:id/nodes/:nodeId/signatures/:signatureId",
    controller.removeSignature
  );
  repositoriesRouter.put(
    "/:id/nodes/:nodeId/signatures/:signatureId/sign",
    controller.signDocument
  );

  repositoriesRouter.post(
    "/:id/nodes/:nodeId/authorisation",
    controller.addAuthoriser
  );
  repositoriesRouter.put(
    "/:id/nodes/:nodeId/authorisation/:authorisationId",
    controller.decideAuthorisation
  );
  repositoriesRouter.delete(
    "/:id/nodes/:nodeId/authorisation/:authorisationId",
    controller.removeAuthoriser
  );

  const treesRouter = Router();
  treesRouter.get("/", controller.listPublished);
  treesRouter.get("/:id", controller.getDocumentTreeNode);

  /** Public token-gated share links (no identity; token is the credential). */
  const sharesRouter = Router();
  sharesRouter.get("/:token", controller.resolveShare);

  /** Signature requests list + public token-gated external signing. */
  const signaturesRouter = Router();
  signaturesRouter.get("/requests", controller.listSignatureRequests);
  signaturesRouter.get("/public/:token", controller.getPublicSignature);
  signaturesRouter.put("/public/:token/sign", controller.signDocumentPublic);

  return {
    service,
    application: {
      getPublishedDocument: (organizationId, id) =>
        service.getPublishedDocumentForOrganization(organizationId, id),
      listPublished: (organizationId, query) =>
        service.listPublishedForOrganization(organizationId, query),
      getDocumentUtilisation: (organizationId) =>
        service.getDocumentUtilisation(organizationId),
    },
    reviewReminders,
    managementRouter,
    repositoriesRouter,
    treesRouter,
    sharesRouter,
    signaturesRouter,
  };
}
