import { Router } from "express";
import type { Authorizer } from "../../../security";
import { createDataImportController } from "../controllers/data-import.controller";
import {
  InlineDataImportQueueAdapter,
  NoOpDataImportNotificationAdapter,
  type DataImportNotificationPort,
  type DataImportQueuePort,
  type DataImportTargetWriterPort,
  NoOpDataImportTargetWriterAdapter,
} from "../ports";
import {
  createDataImportService,
  type DataImportService,
} from "../services/data-import.service";
import { createDataImportMigrator } from "../services/migrator.service";

export type DataImportRouterDeps = {
  authorizer: Authorizer;
  notifications?: DataImportNotificationPort;
  writer?: DataImportTargetWriterPort;
  queue?: DataImportQueuePort;
};

/**
 * Compose the Data Import module.
 * Mounted at /api/v1/data-import
 */
export function createDataImportModule(deps: DataImportRouterDeps): {
  service: DataImportService;
  router: Router;
} {
  const notifications =
    deps.notifications ?? new NoOpDataImportNotificationAdapter();
  const writer = deps.writer ?? new NoOpDataImportTargetWriterAdapter();
  const migrator = createDataImportMigrator({ writer, notifications });

  const queue =
    deps.queue ??
    new InlineDataImportQueueAdapter((job) => migrator.run(job));

  const service = createDataImportService({
    authorizer: deps.authorizer,
    notifications,
    queue,
  });
  const controller = createDataImportController(service);
  const router = Router();

  router.get("/modules", controller.listModules);
  router.get("/schema/:module", controller.getSchema);
  router.post("/validation", controller.validate);
  router.post("/", controller.startImport);

  return { service, router };
}

export function createDataImportRouter(deps: DataImportRouterDeps): Router {
  return createDataImportModule(deps).router;
}
