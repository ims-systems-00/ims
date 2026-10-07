import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import { submitReportBugBodySchema } from "../schemas";
import type { ReportBugService } from "../services/report-bug.service";

export type ReportBugController = {
  submit: RequestHandler;
};

export function createReportBugController(
  service: ReportBugService
): ReportBugController {
  const submit: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(submitReportBugBodySchema, req.body);
      const data = await service.submit(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return { submit };
}
