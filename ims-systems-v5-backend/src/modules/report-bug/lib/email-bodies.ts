import {
  renderEmail,
  renderEmailForOrganisation,
  type EmailBranding,
  type RenderedEmail,
} from "../../../infrastructure/email/templates";
import type { ReportBugCategory } from "../types";

export type BugReportMailContext = {
  category: ReportBugCategory;
  title: string;
  description: string;
  reporterEmail: string;
  reporterName: string;
  organizationId: string;
};

export type BugReportBrandResolver = (
  organizationId: string
) => Promise<EmailBranding>;

/** Support inbox: new customer bug report. */
export async function buildSupportBugReportEmail(
  ctx: BugReportMailContext,
  resolveBranding?: BugReportBrandResolver
): Promise<RenderedEmail> {
  return renderEmailForOrganisation(
    "bug-report-support",
    {
      category: ctx.category,
      title: ctx.title,
      description: ctx.description,
      reporterName: ctx.reporterName,
      reporterEmail: ctx.reporterEmail,
      organizationId: ctx.organizationId,
    },
    {
      organizationId: ctx.organizationId,
      resolveBranding,
    }
  );
}

/** Reporter confirmation. */
export async function buildReporterConfirmationEmail(
  ctx: {
    reporterName: string;
    title: string;
    organizationId?: string;
  },
  resolveBranding?: BugReportBrandResolver
): Promise<RenderedEmail> {
  if (ctx.organizationId && resolveBranding) {
    return renderEmailForOrganisation(
      "bug-report-confirmation",
      {
        reporterName: ctx.reporterName,
        title: ctx.title,
      },
      {
        organizationId: ctx.organizationId,
        resolveBranding,
      }
    );
  }
  return renderEmail("bug-report-confirmation", {
    reporterName: ctx.reporterName,
    title: ctx.title,
  });
}
