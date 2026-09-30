import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  DevAllCalendarListScopeAdapter,
  type CalendarListScopePort,
} from "../ports";
import { createCalendarEventRepository } from "../repositories/calendar-event.repository";
import {
  createCalendarService,
  type CalendarService,
} from "../services/calendar.service";
import { createCalendarController } from "../controllers/calendar.controller";

export type CalendarRouterDeps = {
  authorizer: Authorizer;
  listScope?: CalendarListScopePort;
};

/**
 * Compose Calendar service for route mounting and cross-module adapters.
 */
export function createCalendarModule(deps: CalendarRouterDeps): {
  service: CalendarService;
  router: Router;
} {
  const repository = createCalendarEventRepository();
  const service = createCalendarService({
    repository,
    authorizer: deps.authorizer,
    listScope: deps.listScope ?? new DevAllCalendarListScopeAdapter(),
  });
  const controller = createCalendarController(service);
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.create);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);

  return { service, router };
}

/**
 * HTTP routes for Calendar.
 * Mounted at /api/v1/calendar
 */
export function createCalendarRouter(deps: CalendarRouterDeps): Router {
  return createCalendarModule(deps).router;
}
