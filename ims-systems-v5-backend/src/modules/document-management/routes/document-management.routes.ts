import { Router } from "express";
import type { Authorizer } from "../../../security";
import { createDocumentManagementController } from "../controllers/document-management.controller";
import {
  NoOpDocumentActivityAdapter,
  NoOpDocumentFilesAdapter,
  NoOpDocumentNotificationAdapter,
  type DocumentActivityPort,
  type DocumentFilesPort,
  type DocumentNotificationPort,
} from "../ports";
import { createDocumentRepositoryStore } from "../repositories/document-repository.repository";
import { createDocumentTreeStore } from "../repositories/document-tree.repository";
import {
  createDocumentManagementService,
  type DocumentManagementApplicationPort,
  type DocumentManagementService,
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
  });
  const reviewReminders = createDocumentReviewReminderService({
    trees,
    notifications: notificationsPort,
  });
  const controller = createDocumentManagementController(service);

  const managementRouter = Router();
  managementRouter.get("/overview", controller.overview);

  const repositoriesRouter = Router();
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
    "/:id/nodes/:nodeId/new-version",
    controller.addVersion
  );
  repositoriesRouter.put(
    "/:id/nodes/:nodeId/revision",
    controller.addRevision
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

  return {
    service,
    application: {
      getPublishedDocument: (organizationId, id) =>
        service.getPublishedDocumentForOrganization(organizationId, id),
      listPublished: (organizationId, query) =>
        service.listPublishedForOrganization(organizationId, query),
    },
    reviewReminders,
    managementRouter,
    repositoriesRouter,
    treesRouter,
  };
}
