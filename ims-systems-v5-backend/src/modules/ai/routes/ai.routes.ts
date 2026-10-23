import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  FallbackAiActorDirectoryAdapter,
  NoOpAiActivityAdapter,
  NoOpAiGptAdapter,
  type AiActivityPort,
  type AiActorDirectoryPort,
  type AiGptPort,
} from "../ports";
import { createAiResponseRepository } from "../repositories/ai-response.repository";
import { createAiService, type AiService } from "../services/ai.service";
import { createAiController } from "../controllers/ai.controller";

export type AiRouterDeps = {
  authorizer: Authorizer;
  gpt?: AiGptPort;
  activities?: AiActivityPort;
  actors?: AiActorDirectoryPort;
};

/**
 * Compose AI service for route mounting and cross-module adapters.
 */
export function createAiModule(deps: AiRouterDeps): {
  service: AiService;
  router: Router;
} {
  const service = createAiService({
    repository: createAiResponseRepository(),
    authorizer: deps.authorizer,
    gpt: deps.gpt ?? new NoOpAiGptAdapter(),
    activities: deps.activities ?? new NoOpAiActivityAdapter(),
    actors: deps.actors ?? new FallbackAiActorDirectoryAdapter(),
  });
  const controller = createAiController(service);
  const router = Router();

  router.post("/gpt-stream", controller.streamGpt);
  router.post("/gpt-normal", controller.generateGpt);
  router.post("/responses", controller.create);
  router.get("/responses", controller.list);
  router.get("/responses/:id", controller.getById);
  router.put("/responses/:id", controller.update);
  router.delete("/responses/:id", controller.remove);

  return { service, router };
}

/**
 * HTTP routes for AI / Alice.
 * Mounted at /api/v1/ai
 */
export function createAiRouter(deps: AiRouterDeps): Router {
  return createAiModule(deps).router;
}
