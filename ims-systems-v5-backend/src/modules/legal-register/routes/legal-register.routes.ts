import { Router } from "express";
import type { Authorizer } from "../../../security";
import { createLegalRegisterController } from "../controllers/legal-register.controller";
import { createLegalRegisterRepository } from "../repositories/legal-register.repository";
import {
  createLegalRegisterService,
  type LegalRegisterService,
} from "../services/legal-register.service";

/**
 * Compose the Legal register. Mounted at /api/v1/legal-register
 */
export function createLegalRegisterModule(deps: { authorizer: Authorizer }): {
  service: LegalRegisterService;
  router: Router;
} {
  const service = createLegalRegisterService({
    repository: createLegalRegisterRepository(),
    authorizer: deps.authorizer,
  });
  const controller = createLegalRegisterController(service);
  const router = Router();

  router.get("/", controller.get);
  router.post("/duties", controller.createDuty);
  router.post("/duties/common", controller.addCommonDuties);
  router.patch("/duties/:id", controller.updateDuty);
  router.delete("/duties/:id", controller.removeDuty);
  router.post("/duties/:id/evidence", controller.addEvidence);
  router.delete("/duties/:id/evidence/:evidenceId", controller.removeEvidence);
  router.post("/review", controller.markReviewed);
  router.patch("/settings", controller.updateSettings);

  return { service, router };
}
