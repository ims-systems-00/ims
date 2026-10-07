import { Bug } from "lucide-react";
import { PageHeader } from "@/shared/layout";
import { notify } from "@/shared/lib/toast";
import { ReportBugForm } from "../components/report-bug-form";
import { useSubmitReportBugMutation } from "../hooks/use-report-bug";
import type { SubmitReportBugInput } from "../types";

/**
 * Sidebar → Report Bug.
 * Emails support + sends a confirmation to the session user (no Jira).
 */
export function ReportBugPage() {
  const mutation = useSubmitReportBugMutation();

  async function handleSubmit(values: SubmitReportBugInput) {
    try {
      await mutation.mutateAsync(values);
      notify.success(
        "Your response has been recorded. An iMS Systems administrator will contact you soon."
      );
    } catch (error) {
      notify.fromError(error, "Unable to submit bug report");
    }
  }

  return (
    <div className="mx-auto max-w-8xl space-y-5">
      <PageHeader
        title="Report Bug"
        description="Describe what happened, including steps to reproduce, expected behaviour, and the actual outcome."
      />

      <section className="ims-panel overflow-hidden">
        <div className="ims-panel-header">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Bug className="size-4 text-muted-foreground" aria-hidden />
            Report an issue
          </h2>
        </div>
        <div className="px-4 py-4">
          <ReportBugForm
            pending={mutation.isPending}
            onSubmit={handleSubmit}
          />
        </div>
      </section>
    </div>
  );
}
