import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  FallbackAiActorDirectoryAdapter,
  NoOpAiActivityAdapter,
  NoOpAiContextAdapter,
  NoOpAiGptAdapter,
  type AiActivityPort,
  type AiActorDirectoryPort,
  type AiContextPort,
  type AiGptPort,
} from "../ports";
import { createAiResponseRepository } from "../repositories/ai-response.repository";
import { createAiChatThreadRepository } from "../repositories/ai-chat-thread.repository";
import { createAiService, type AiService } from "../services/ai.service";
import {
  createAiChatService,
  type AiChatService,
} from "../services/ai-chat.service";
import { createAiController } from "../controllers/ai.controller";
import { createAiChatController } from "../controllers/ai-chat.controller";

export type AiRouterDeps = {
  authorizer: Authorizer;
  gpt?: AiGptPort;
  activities?: AiActivityPort;
  actors?: AiActorDirectoryPort;
  context?: AiContextPort;
};

/**
 * Compose AI service for route mounting and cross-module adapters.
 */
export function createAiModule(deps: AiRouterDeps): {
  service: AiService;
  chat: AiChatService;
  router: Router;
} {
  const gpt = deps.gpt ?? new NoOpAiGptAdapter();
  const service = createAiService({
    repository: createAiResponseRepository(),
    authorizer: deps.authorizer,
    gpt,
    activities: deps.activities ?? new NoOpAiActivityAdapter(),
    actors: deps.actors ?? new FallbackAiActorDirectoryAdapter(),
  });
  const chat = createAiChatService({
    threads: createAiChatThreadRepository(),
    authorizer: deps.authorizer,
    gpt,
    context: deps.context ?? new NoOpAiContextAdapter(),
  });
  const controller = createAiController(service);
  const chatController = createAiChatController(chat);
  const router = Router();

  router.post("/gpt-stream", controller.streamGpt);
  router.post("/gpt-normal", controller.generateGpt);
  router.post("/responses", controller.create);
  router.get("/responses", controller.list);
  router.get("/responses/:id", controller.getById);
  router.put("/responses/:id", controller.update);
  router.delete("/responses/:id", controller.remove);

  router.post("/chat/stream", chatController.streamChat);
  router.get("/chat/threads", chatController.listThreads);
  router.post("/chat/threads", chatController.createThread);
  router.get("/chat/threads/:id", chatController.getThread);
  router.delete("/chat/threads/:id", chatController.deleteThread);

  return { service, chat, router };
}

/**
 * HTTP routes for AI / Alice.
 * Mounted at /api/v1/ai
 */
export function createAiRouter(deps: AiRouterDeps): Router {
  return createAiModule(deps).router;
}
