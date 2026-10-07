export const REPORT_BUG_CATEGORIES = [
  "Bug",
  "Feature request",
  "Enhancement",
  "Question",
] as const;

export type ReportBugCategory = (typeof REPORT_BUG_CATEGORIES)[number];

export type SubmitReportBugInput = {
  category: ReportBugCategory;
  title: string;
  description: string;
};

export type SubmitReportBugResult = {
  accepted: true;
  category: ReportBugCategory;
  title: string;
  /** Whether outbound mail was attempted (false when EMAIL_ENABLED=false). */
  emailed: boolean;
};
