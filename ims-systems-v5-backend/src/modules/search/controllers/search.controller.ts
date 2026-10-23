import type { RequestHandler } from "express";
import { sendSuccess } from "../../../shared";
import type { GlobalSearchService } from "../services/search.service";

export function createSearchController(service: GlobalSearchService): {
  search: RequestHandler;
} {
  return {
    search: async (req, res, next) => {
      try {
        const q = typeof req.query.q === "string" ? req.query.q : "";
        const limit = Number(req.query.limit ?? 5);
        const data = await service.search(
          req.identity,
          q,
          Number.isFinite(limit) ? limit : 5,
        );
        sendSuccess(res, data, 200, req.correlationId);
      } catch (error) {
        next(error);
      }
    },
  };
}
