import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  actionCentreQuerySchema,
  journeyStepBodySchema,
  journeyStepParamSchema,
  activityQuerySchema,
  adviceIdParamSchema,
  adviceQuerySchema,
  healthQuerySchema,
  moduleParamSchema,
  snoozeBodySchema,
} from "../schemas";
import type { LiveComplianceService } from "../services/live-compliance.service";

export type LiveComplianceController = {
  health: RequestHandler;
  moduleHealth: RequestHandler;
  advice: RequestHandler;
  snooze: RequestHandler;
  runAction: RequestHandler;
  activity: RequestHandler;
  actionCentre: RequestHandler;
  journey: RequestHandler;
  setJourneyStep: RequestHandler;
};

export function createLiveComplianceController(
  service: LiveComplianceService
): LiveComplianceController {
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
    health: handle((req) => {
      const { standard } = parseWithSchema(healthQuerySchema, req.query);
      return service.health(req.identity, standard);
    }),
    moduleHealth: handle((req) => {
      const { module } = parseWithSchema(moduleParamSchema, req.params);
      return service.moduleHealth(req.identity, module);
    }),
    advice: handle((req) => {
      const query = parseWithSchema(adviceQuerySchema, req.query);
      return service.advice(req.identity, query);
    }),
    snooze: handle((req) => {
      const { id } = parseWithSchema(adviceIdParamSchema, req.params);
      const { days } = parseWithSchema(snoozeBodySchema, req.body ?? {});
      return service.snooze(req.identity, id, days);
    }),
    runAction: handle((req) => {
      const { id } = parseWithSchema(adviceIdParamSchema, req.params);
      return service.runAction(req.identity, id);
    }),
    activity: handle((req) => {
      const { limit } = parseWithSchema(activityQuerySchema, req.query);
      return service.activity(req.identity, limit);
    }),
    actionCentre: handle((req) => {
      const { scope } = parseWithSchema(actionCentreQuerySchema, req.query);
      return service.actionCentre(req.identity, scope);
    }),
    journey: handle((req) => service.journey(req.identity)),
    setJourneyStep: handle((req) => {
      const { step } = parseWithSchema(journeyStepParamSchema, req.params);
      const { done } = parseWithSchema(journeyStepBodySchema, req.body ?? {});
      return service.setJourneyStep(req.identity, step, done);
    }),
  };
}
