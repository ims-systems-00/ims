import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  addEvidenceBodySchema,
  createLegalDutyBodySchema,
  dutyIdParamSchema,
  evidenceParamSchema,
  settingsBodySchema,
  updateLegalDutyBodySchema,
} from "../schemas";
import type { LegalRegisterService } from "../services/legal-register.service";

export type LegalRegisterController = Record<
  | "get"
  | "createDuty"
  | "addCommonDuties"
  | "updateDuty"
  | "removeDuty"
  | "addEvidence"
  | "removeEvidence"
  | "markReviewed"
  | "updateSettings",
  RequestHandler
>;

export function createLegalRegisterController(
  service: LegalRegisterService
): LegalRegisterController {
  const handle =
    (fn: (req: Parameters<RequestHandler>[0]) => Promise<unknown>, status = 200): RequestHandler =>
    async (req, res, next) => {
      try {
        sendSuccess(res, await fn(req), status, req.correlationId);
      } catch (error) {
        next(error);
      }
    };

  return {
    get: handle((req) => service.get(req.identity)),
    createDuty: handle(
      (req) => service.createDuty(req.identity, parseWithSchema(createLegalDutyBodySchema, req.body)),
      201
    ),
    addCommonDuties: handle((req) => service.addCommonDuties(req.identity)),
    updateDuty: handle((req) => {
      const { id } = parseWithSchema(dutyIdParamSchema, req.params);
      return service.updateDuty(req.identity, id, parseWithSchema(updateLegalDutyBodySchema, req.body));
    }),
    removeDuty: handle((req) => {
      const { id } = parseWithSchema(dutyIdParamSchema, req.params);
      return service.removeDuty(req.identity, id);
    }),
    addEvidence: handle((req) => {
      const { id } = parseWithSchema(dutyIdParamSchema, req.params);
      return service.addEvidence(req.identity, id, parseWithSchema(addEvidenceBodySchema, req.body));
    }, 201),
    removeEvidence: handle((req) => {
      const { id, evidenceId } = parseWithSchema(evidenceParamSchema, req.params);
      return service.removeEvidence(req.identity, id, evidenceId);
    }),
    markReviewed: handle((req) => service.markReviewed(req.identity)),
    updateSettings: handle((req) =>
      service.updateSettings(req.identity, parseWithSchema(settingsBodySchema, req.body))
    ),
  };
}
