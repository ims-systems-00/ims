import { apiRequest } from "@/shared/lib/http";
import type { SubmitReportBugInput, SubmitReportBugResult } from "../types";

/**
 * Submit a customer bug / feedback report.
 * POST /report-bug
 */
export function submitReportBug(
  body: SubmitReportBugInput
): Promise<SubmitReportBugResult> {
  return apiRequest<SubmitReportBugResult>("/report-bug", {
    method: "POST",
    body,
  });
}
