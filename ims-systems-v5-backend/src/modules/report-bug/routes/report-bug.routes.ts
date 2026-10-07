import { Router } from "express";
import type { ReportBugEmailPort } from "../ports";
import { NoOpReportBugEmailAdapter } from "../ports";
import { createReportBugController } from "../controllers/report-bug.controller";
import {
  createReportBugService,
  type ReportBugService,
} from "../services/report-bug.service";

export type ReportBugRouterDeps = {
  email?: ReportBugEmailPort;
  supportEmails: string[];
  /** Delay between support + confirmation emails (Mailtrap rate limits). */
  confirmationDelayMs?: number;
};

/**
 * Compose Report Bug module (email-based, no Jira).
 * Mounted at /api/v1/report-bug
 */
export function createReportBugModule(deps: ReportBugRouterDeps): {
  service: ReportBugService;
  router: Router;
} {
  const service = createReportBugService({
    email: deps.email ?? new NoOpReportBugEmailAdapter(),
    supportEmails: deps.supportEmails,
    confirmationDelayMs: deps.confirmationDelayMs,
  });
  const controller = createReportBugController(service);
  const router = Router();

  router.post("/", controller.submit);

  return { service, router };
}

export function createReportBugRouter(deps: ReportBugRouterDeps): Router {
  return createReportBugModule(deps).router;
}
