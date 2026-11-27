import type { RequestHandler } from "express";
import { z } from "zod";
import { parseWithSchema, sendSuccess } from "../../../shared";
import { ALICE_DRAFT_STATUSES } from "./alice-draft.repository";
import type { AliceService } from "./alice.service";

const taskParamSchema = z.object({ task: z.string().min(1).max(64) });
const idParamSchema = z.object({ id: z.string().min(1).max(64) });
const runBodySchema = z.object({ ref: z.string().trim().max(500).nullish() });
const listQuerySchema = z.object({
  status: z.enum(ALICE_DRAFT_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type AliceController = {
  tasks: RequestHandler;
  run: RequestHandler;
  listDrafts: RequestHandler;
  getDraft: RequestHandler;
  approve: RequestHandler;
  discard: RequestHandler;
};

export function createAliceController(service: AliceService): AliceController {
  const handle =
    (fn: (req: Parameters<RequestHandler>[0]) => Promise<unknown> | unknown): RequestHandler =>
    async (req, res, next) => {
      try {
        sendSuccess(res, await fn(req), 200, req.correlationId);
      } catch (error) {
        next(error);
      }
    };

  /** NDJSON stream: status lines while drafting, then the draft (or an error). */
  const run: RequestHandler = async (req, res, next) => {
    let started = false;
    const start = () => {
      if (started || res.headersSent) return;
      started = true;
      res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      if (typeof res.flushHeaders === "function") res.flushHeaders();
    };
    try {
      const { task } = parseWithSchema(taskParamSchema, req.params);
      const { ref } = parseWithSchema(runBodySchema, req.body ?? {});
      await service.run(req.identity, task, ref ?? null, (event) => {
        if (res.writableEnded) return;
        start();
        res.write(`${JSON.stringify(event)}\n`);
      });
      start();
      res.end();
    } catch (error) {
      if (!res.headersSent) {
        next(error);
        return;
      }
      res.write(
        `${JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "ALICE failed" })}\n`
      );
      res.end();
    }
  };

  return {
    tasks: handle(() => service.tasks()),
    run,
    listDrafts: handle((req) => service.listDrafts(req.identity, parseWithSchema(listQuerySchema, req.query))),
    getDraft: handle((req) => service.getDraft(req.identity, parseWithSchema(idParamSchema, req.params).id)),
    approve: handle((req) => service.approve(req.identity, parseWithSchema(idParamSchema, req.params).id)),
    discard: handle((req) => service.discard(req.identity, parseWithSchema(idParamSchema, req.params).id)),
  };
}
