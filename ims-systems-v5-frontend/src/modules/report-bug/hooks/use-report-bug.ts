import { useMutation } from "@tanstack/react-query";
import { submitReportBug } from "../api/report-bug";
import type { SubmitReportBugInput } from "../types";

export function useSubmitReportBugMutation() {
  return useMutation({
    mutationFn: (body: SubmitReportBugInput) => submitReportBug(body),
  });
}
