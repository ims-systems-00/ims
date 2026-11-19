import { Router } from "express";
import type { Authorizer } from "../../../security";
import { createAslSupplierController } from "../controllers/asl-supplier.controller";
import {
  NoOpAslEmailAdapter,
  NoOpAslFilesAdapter,
  NoOpAslIncidentAdapter,
  NoOpAslNotificationAdapter,
  NoOpAslOrgAdapter,
  NoOpAslTaskAdapter,
  type AslEmailPort,
  type AslFilesPort,
  type AslIncidentPort,
  type AslNotificationPort,
  type AslOrgPort,
  type AslTaskPort,
} from "../ports";
import { createAslSettingsRepository } from "../repositories/asl-settings.repository";
import { createAslSupplierRepository } from "../repositories/asl-supplier.repository";
import { createAslSupplierService } from "../services/asl-supplier.service";

export type AslSupplierRouterDeps = {
  authorizer: Authorizer;
  email?: AslEmailPort;
  files?: AslFilesPort;
  tasks?: AslTaskPort;
  incidents?: AslIncidentPort;
  org?: AslOrgPort;
  notifications?: AslNotificationPort;
  tokenSecret: string;
  publicApiBaseUrl: string;
  clientUrl: string;
  defaultFromEmail: string;
};

export function createAslSupplierModule(deps: AslSupplierRouterDeps): {
  service: ReturnType<typeof createAslSupplierService>;
  router: Router;
} {
  const suppliers = createAslSupplierRepository();
  const settings = createAslSettingsRepository(deps.defaultFromEmail);
  const service = createAslSupplierService({
    suppliers,
    settings,
    authorizer: deps.authorizer,
    email: deps.email ?? new NoOpAslEmailAdapter(),
    files: deps.files ?? new NoOpAslFilesAdapter(),
    tasks: deps.tasks ?? new NoOpAslTaskAdapter(),
    incidents: deps.incidents ?? new NoOpAslIncidentAdapter(),
    org: deps.org ?? new NoOpAslOrgAdapter(),
    notifications: deps.notifications ?? new NoOpAslNotificationAdapter(),
    tokenSecret: deps.tokenSecret,
    publicApiBaseUrl: deps.publicApiBaseUrl,
    clientUrl: deps.clientUrl,
  });
  const controller = createAslSupplierController(service);
  const router = Router();

  // Static paths before :id
  router.get("/settings", controller.getSettings);
  router.put("/settings", controller.updateSettings);
  router.get("/overview", controller.overview);
  router.post("/notify", controller.notify);
  router.get("/auditor-pack", controller.auditorPack);
  router.get("/export.csv", controller.exportCsv);
  router.post("/share", controller.share);
  router.get("/public/:token", controller.publicSnapshot);
  router.get("/upload/:token", controller.uploadContext);
  router.post("/upload/:token/prepare", controller.preparePublicUpload);
  router.post("/upload/:token", controller.publicUpload);

  router.get("/", controller.list);
  router.post("/", controller.create);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.post("/:id/documents", controller.addDocument);
  router.patch("/:id/documents/:docId", controller.updateDocument);
  router.delete("/:id/documents/:docId", controller.deleteDocument);
  router.post("/:id/evaluations", controller.addEvaluation);

  return { service, router };
}
