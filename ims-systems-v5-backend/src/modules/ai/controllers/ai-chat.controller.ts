import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  createChatThreadBodySchema,
  idParamSchema,
  streamChatBodySchema,
} from "../schemas";
import type { AiChatService } from "../services/ai-chat.service";

export type AiChatController = {
  streamChat: RequestHandler;
  listThreads: RequestHandler;
  getThread: RequestHandler;
  createThread: RequestHandler;
  deleteThread: RequestHandler;
};

export function createAiChatController(
  chat: AiChatService
): AiChatController {
  const streamChat: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(streamChatBodySchema, req.body);

      let started = false;
      const ensureStarted = () => {
        if (started || res.headersSent) return;
        started = true;
        res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
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

      await chat.streamChat(
        req.identity,
        body,
        (event) => {
          if (!res.writableEnded) {
            ensureStarted();
            res.write(`${JSON.stringify(event)}\n`);
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
      try {
        res.write(
          `${JSON.stringify({
            type: "error",
            message:
              error instanceof Error ? error.message : "Chat stream failed",
          })}\n`
        );
      } catch {
        // ignore write failures on closed socket
      }
      res.end();
    }
  };

  const listThreads: RequestHandler = async (req, res, next) => {
    try {
      const data = await chat.listThreads(req.identity);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getThread: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await chat.getThread(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const createThread: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createChatThreadBodySchema, req.body ?? {});
      const data = await chat.createThread(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const deleteThread: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      await chat.deleteThread(req.identity, id);
      sendSuccess(res, { id }, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return {
    streamChat,
    listThreads,
    getThread,
    createThread,
    deleteThread,
  };
}
