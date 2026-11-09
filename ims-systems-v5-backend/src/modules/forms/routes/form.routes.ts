import { Router } from "express";
import type { Authorizer } from "../../../security";
import { createFormController } from "../controllers/form.controller";
import { createFormElementRepository } from "../repositories/form-element.repository";
import { createFormRepository } from "../repositories/form.repository";
import { createFormResponseRepository } from "../repositories/form-response.repository";
import { createFormSubmissionRepository } from "../repositories/form-submission.repository";
import {
  createFormService,
  type FormService,
} from "../services/form.service";

export type FormRouterDeps = {
  authorizer: Authorizer;
};

/**
 * Compose Forms module for route mounting.
 */
export function createFormsModule(deps: FormRouterDeps): {
  service: FormService;
  router: Router;
} {
  const service = createFormService({
    forms: createFormRepository(),
    elements: createFormElementRepository(),
    submissions: createFormSubmissionRepository(),
    responses: createFormResponseRepository(),
    authorizer: deps.authorizer,
  });
  const controller = createFormController(service);
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.create);
  router.get("/:id", controller.getById);
  router.put("/:id", controller.update);
  router.delete("/:id/soft", controller.softDelete);
  router.delete("/:id/hard", controller.hardDelete);
  router.put("/:id/restore", controller.restore);

  router.get("/:formId/elements", controller.listElements);
  router.post("/:formId/elements", controller.createElement);
  router.get("/:formId/elements/:id", controller.getElement);
  router.put("/:formId/elements/:id", controller.updateElement);
  router.put("/:formId/elements/:id/order", controller.reorderElement);
  router.delete("/:formId/elements/:id/hard", controller.hardDeleteElement);

  router.get("/:formId/submissions", controller.listSubmissions);
  router.post("/:formId/submissions", controller.createSubmission);
  router.get("/:formId/submissions/:id", controller.getSubmission);
  router.put("/:formId/submissions/:id", controller.updateSubmission);
  router.delete(
    "/:formId/submissions/:id/hard",
    controller.hardDeleteSubmission
  );

  return { service, router };
}

export function createFormsRouter(deps: FormRouterDeps): Router {
  return createFormsModule(deps).router;
}
