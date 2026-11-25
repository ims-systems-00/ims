import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  NoOpDocumentModuleLibraryAdapter,
  type DocumentModuleLibraryPort,
} from "../../document-management";
import { createInventoryTaskAdapter } from "../adapters";
import { createInventoryController } from "../controllers/inventory.controller";
import {
  NoOpInventoryIncidentAdapter,
  NoOpInventorySupplierAdapter,
  NoOpInventoryTaskAdapter,
  type InventoryIncidentPort,
  type InventorySupplierPort,
  type InventoryTaskPort,
} from "../ports";
import { createInventoryAssetRepository } from "../repositories/inventory-asset.repository";
import { createInventorySettingsRepository } from "../repositories/inventory-settings.repository";
import { createInventoryStockRepository } from "../repositories/inventory-stock.repository";
import { createInventoryService } from "../services/inventory.service";

export type InventoryRouterDeps = {
  authorizer: Authorizer;
  clientUrl: string;
  tasks?: InventoryTaskPort;
  incidents?: InventoryIncidentPort;
  suppliers?: InventorySupplierPort;
  orgNameResolver?: (organizationId: string) => Promise<string | null>;
  documents?: DocumentModuleLibraryPort;
};

export function createInventoryModule(deps: InventoryRouterDeps): {
  service: ReturnType<typeof createInventoryService>;
  router: Router;
} {
  const assets = createInventoryAssetRepository();
  const settings = createInventorySettingsRepository();
  const stock = createInventoryStockRepository();
  const service = createInventoryService({
    assets,
    settings,
    stock,
    authorizer: deps.authorizer,
    tasks: deps.tasks ?? new NoOpInventoryTaskAdapter(),
    incidents: deps.incidents ?? new NoOpInventoryIncidentAdapter(),
    suppliers: deps.suppliers ?? new NoOpInventorySupplierAdapter(),
    documents: deps.documents ?? new NoOpDocumentModuleLibraryAdapter(),
    clientUrl: deps.clientUrl,
    orgNameResolver: deps.orgNameResolver,
  });
  const controller = createInventoryController(service);
  const router = Router();

  router.get("/categories", controller.categories);
  router.get("/settings", controller.getSettings);
  router.put("/settings", controller.updateSettings);
  router.get("/overview", controller.overview);
  router.get("/schedule", controller.schedule);
  router.get("/compliance-map", controller.complianceMap);
  router.get("/auditor-pack", controller.auditorPack);
  router.get("/calibration-labs", controller.listCalibrationLabs);

  router.get("/export/register.csv", controller.exportRegisterCsv);
  router.get("/export/schedule.csv", controller.exportScheduleCsv);
  router.get("/export/fixed-assets.csv", controller.exportFixedAssetsCsv);
  router.get("/export/model.json", controller.exportModelJson);

  router.get("/stock", controller.listStock);
  router.post("/stock", controller.createStock);
  router.patch("/stock/:id", controller.updateStock);
  router.post("/stock/:id/move", controller.moveStock);

  router.get("/assets", controller.list);
  router.post("/assets", controller.create);
  router.post("/assets/mark-labelled", controller.markLabelled);
  router.get("/assets/:id", controller.getById);
  router.patch("/assets/:id", controller.update);
  router.post("/assets/:id/stage", controller.moveStage);
  router.post("/assets/:id/checks", controller.recordCheck);
  router.post("/assets/:id/fault", controller.reportFault);
  router.post("/assets/:id/move", controller.moveLocation);
  router.post("/assets/:id/sighting", controller.confirmSighting);
  router.post("/assets/:id/each-use", controller.recordEachUse);

  router.get(
    "/public/:organizationId/assets/by-tag/:tag",
    controller.publicGet
  );
  router.post(
    "/public/:organizationId/assets/by-tag/:tag/fault",
    controller.publicFault
  );
  router.post(
    "/public/:organizationId/assets/by-tag/:tag/each-use",
    controller.publicEachUse
  );
  router.post(
    "/public/:organizationId/assets/by-tag/:tag/move",
    controller.publicMove
  );
  router.post(
    "/public/:organizationId/assets/by-tag/:tag/sighting",
    controller.publicSighting
  );
  router.post(
    "/public/:organizationId/assets/by-tag/:tag/checks",
    controller.publicChecks
  );

  return { service, router };
}

export { createInventoryTaskAdapter };
