import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  DevAcceptFunctionalUnitAdapter,
  type BusinessPremiseFunctionalUnitPort,
} from "../ports";
import { createBusinessPremiseFunctionalUnitAdapter } from "../adapters/functional-unit.adapter";
import { createBusinessPremiseRepository } from "../repositories/business-premise.repository";
import {
  createBusinessPremiseService,
  type BusinessPremiseService,
} from "../services/business-premise.service";
import { createBusinessPremiseController } from "../controllers/business-premise.controller";

export type BusinessPremiseRouterDeps = {
  authorizer: Authorizer;
  functionalUnits?: BusinessPremiseFunctionalUnitPort;
};

/**
 * Compose Business Premise service for route mounting.
 */
export function createBusinessPremiseModule(
  deps: BusinessPremiseRouterDeps
): {
  service: BusinessPremiseService;
  router: Router;
} {
  const repository = createBusinessPremiseRepository();
  const service = createBusinessPremiseService({
    repository,
    authorizer: deps.authorizer,
    functionalUnits:
      deps.functionalUnits ?? createBusinessPremiseFunctionalUnitAdapter(),
  });
  const controller = createBusinessPremiseController(service);
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.create);
  router.post("/:id/functional-units", controller.attachFunctionalUnit);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);

  return { service, router };
}

/**
 * HTTP routes for Business Premises.
 * Mounted at /api/v1/business-premises
 *
 * Historical V4 path: /api/.../iamGroupPremises
 * Historical attach path used `/policies/` but attached a Functional Unit —
 * V5 uses `/functional-units` to reflect the real domain operation.
 */
export function createBusinessPremiseRouter(
  deps: BusinessPremiseRouterDeps
): Router {
  return createBusinessPremiseModule(deps).router;
}

export { DevAcceptFunctionalUnitAdapter };
