import { Router } from "express";
import type { ObjectStoragePort } from "../ports";
import { MemoryObjectStorageAdapter } from "../ports";
import { createFilesController } from "../controllers/files.controller";
import {
  createFilesService,
  type FilesService,
  type FilesServiceConfig,
} from "../services/files.service";

export type FilesRouterDeps = {
  storage?: ObjectStoragePort;
  config: FilesServiceConfig;
};

/**
 * Compose File Handler module.
 * Mounted at /api/v1/files
 *
 * Routes (V4-compatible headers):
 * - GET    /signed-url/uploads  → upload signed URL
 * - GET    /signed-url          → view/download signed URL
 * - DELETE /                    → delete stored object
 *
 * Document preview / LibreOffice conversion is deferred.
 */
export function createFilesModule(deps: FilesRouterDeps): {
  service: FilesService;
  router: Router;
  storage: ObjectStoragePort;
} {
  const storage = deps.storage ?? new MemoryObjectStorageAdapter();
  const service = createFilesService({
    storage,
    config: deps.config,
  });
  const controller = createFilesController(service);
  const router = Router();

  router.get("/signed-url/uploads", controller.getUploadUrl);
  router.get("/signed-url", controller.getViewUrl);
  router.delete("/", controller.deleteFile);

  return { service, router, storage };
}

export function createFilesRouter(deps: FilesRouterDeps): Router {
  return createFilesModule(deps).router;
}
