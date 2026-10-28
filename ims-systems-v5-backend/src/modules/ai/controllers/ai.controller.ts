import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  createAiResponseBodySchema,
  gptBodySchema,
  idParamSchema,
  listAiResponsesQuerySchema,
  updateAiResponseBodySchema,
} from "../schemas";
import type { AiService } from "../services/ai.service";

export type AiController = {
  streamGpt: RequestHandler;
  generateGpt: RequestHandler;
  list: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
};

export function createAiController(service: AiService): AiController {
  const streamGpt: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(gptBodySchema, req.body);

      // Do not flush headers until the first chunk — otherwise OpenAI/config
      // failures become empty HTTP 200 bodies and the FE shows blank sections.
      let started = false;
      const ensureStarted = () => {
        if (started || res.headersSent) return;
        started = true;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("X-Accel-Buffering", "no");
        if (typeof res.flushHeaders === "function") {
          res.flushHeaders();
        }
      };

      const controller = new AbortController();
      res.on("close", () => {
        if (!res.writableEnded) controller.abort();
      });

      await service.streamGpt(
        req.identity,
        body,
        (chunk) => {
          if (!res.writableEnded) {
            ensureStarted();
            res.write(chunk);
          }
        },
        controller.signal
      );
      ensureStarted();
      res.end();
    } catch (error) {
      if (!res.headersSent) {
        next(error);
        return;
      }
      // Headers already sent (partial stream) — close the body; FE should
      // treat truncated/empty sections as incomplete.
      res.end();
    }
  };

  const generateGpt: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(gptBodySchema, req.body);
      const data = await service.generateGpt(req.identity, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listAiResponsesQuerySchema, req.query);
      const data = await service.list(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getById: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.getById(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const create: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createAiResponseBodySchema, req.body);
      const data = await service.create(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateAiResponseBodySchema, req.body);
      const data = await service.update(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const remove: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.remove(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return {
    streamGpt,
    generateGpt,
    list,
    getById,
    create,
    update,
    remove,
  };
}
