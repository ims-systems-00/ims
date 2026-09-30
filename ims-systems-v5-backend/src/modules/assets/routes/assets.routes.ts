import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  AcceptAnyBusinessUnitAdapter,
  AcceptAnyCategoryAdapter,
  AcceptAnyUserAdapter,
  type BusinessUnitLookupPort,
  type CategoryLookupPort,
  type UserLookupPort,
} from "../ports";
import { createHardwareAssetRepository } from "../repositories/hardware.repository";
import { createInformationAssetRepository } from "../repositories/information.repository";
import { createPeopleAssetRepository } from "../repositories/people.repository";
import { createPremiseAssetRepository } from "../repositories/premise.repository";
import { createSoftwareAssetRepository } from "../repositories/software.repository";
import { createAssetsService } from "../services/assets.service";
import { createAssetsController } from "../controllers/assets.controller";

export type AssetsRouterDeps = {
  authorizer: Authorizer;
  users?: UserLookupPort;
  businessUnits?: BusinessUnitLookupPort;
  categories?: CategoryLookupPort;
};

/**
 * Compose Assets service for route mounting and cross-module adapters.
 */
export function createAssetsModule(deps: AssetsRouterDeps): {
  service: ReturnType<typeof createAssetsService>;
  router: Router;
} {
  const service = createAssetsService({
    hardware: createHardwareAssetRepository(),
    software: createSoftwareAssetRepository(),
    people: createPeopleAssetRepository(),
    premise: createPremiseAssetRepository(),
    information: createInformationAssetRepository(),
    authorizer: deps.authorizer,
    users: deps.users ?? new AcceptAnyUserAdapter(),
    businessUnits: deps.businessUnits ?? new AcceptAnyBusinessUnitAdapter(),
    categories: deps.categories ?? new AcceptAnyCategoryAdapter(),
  });
  const controller = createAssetsController(service);
  const router = Router();

  router.get("/stats", controller.stats);

  router.get("/hardware", controller.listHardware);
  router.post("/hardware", controller.createHardware);
  router.get("/hardware/:id", controller.getHardware);
  router.patch("/hardware/:id", controller.updateHardware);
  router.delete("/hardware/:id", controller.deleteHardware);

  router.get("/software", controller.listSoftware);
  router.post("/software", controller.createSoftware);
  router.get("/software/:id", controller.getSoftware);
  router.patch("/software/:id", controller.updateSoftware);
  router.delete("/software/:id", controller.deleteSoftware);
  router.post("/software/:id/keys", controller.addSoftwareKey);
  router.delete("/software/:id/keys/:keyId", controller.removeSoftwareKey);
  router.post("/software/:id/documents", controller.addSoftwareDocument);
  router.delete(
    "/software/:id/documents/:documentId",
    controller.removeSoftwareDocument
  );

  router.get("/people", controller.listPeople);
  router.post("/people", controller.createPeople);
  router.get("/people/:id", controller.getPeople);
  router.patch("/people/:id", controller.updatePeople);
  router.delete("/people/:id", controller.deletePeople);

  router.get("/premise", controller.listPremise);
  router.post("/premise", controller.createPremise);
  router.get("/premise/:id", controller.getPremise);
  router.patch("/premise/:id", controller.updatePremise);
  router.delete("/premise/:id", controller.deletePremise);

  router.get("/information", controller.listInformation);
  router.post("/information", controller.createInformation);
  router.get("/information/:id", controller.getInformation);
  router.patch("/information/:id", controller.updateInformation);
  router.delete("/information/:id", controller.deleteInformation);

  return { service, router };
}

/**
 * HTTP routes for Assets (Inventory).
 * Mounted at /api/v1/assets
 */
export function createAssetsRouter(deps: AssetsRouterDeps): Router {
  return createAssetsModule(deps).router;
}
