import { isApiClientError } from "@/shared/lib/http/errors";

type DetailIssue = { path?: string; message?: string };

/**
 * Prefer ApiClientError.message; append first Zod-style detail lines when present.
 */
export function formatImportApiError(error: unknown, fallback: string): string {
  if (!isApiClientError(error)) return fallback;

  const parts = [error.message || fallback];
  const details = error.details;

  if (Array.isArray(details) && details.length > 0) {
    const lines = details
      .slice(0, 3)
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const issue = item as DetailIssue;
          if (issue.message && issue.path) {
            return `${issue.path}: ${issue.message}`;
          }
          if (issue.message) return issue.message;
        }
        return null;
      })
      .filter((line): line is string => Boolean(line));

    if (lines.length > 0) {
      parts.push(lines.join("; "));
      if (details.length > 3) {
        parts.push(`(+${details.length - 3} more)`);
      }
    }
  }

  return parts.join(" — ");
}
