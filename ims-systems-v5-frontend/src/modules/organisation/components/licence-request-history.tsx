import { cn } from "@/shared/lib/utils";
import { useLicenceRequestsQuery } from "../hooks/use-organisations";
import type { LicenceRequest, LicenceRequestStatus } from "../types";

const STATUS_STYLES: Record<LicenceRequestStatus, string> = {
  Granted: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  Pending: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  Cancelled: "border-destructive/40 bg-destructive/10 text-destructive",
};

function requestSummary(request: LicenceRequest): string {
  const parts: string[] = [];
  if (request.superUser) parts.push(`${request.superUser} Super Admin`);
  if (request.users) parts.push(`${request.users} User`);
  if (request.groups) parts.push(`${request.groups} Business unit`);
  for (const tool of request.complianceTools) parts.push(tool);
  for (const mod of request.additionalModules) parts.push(mod);
  return parts.join(" · ") || "—";
}

/** Org-side licence request history (LR- references, latest first). */
export function LicenceRequestHistory() {
  const query = useLicenceRequestsQuery();
  const items = query.data?.items ?? [];

  return (
    <div>
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        Licence requests
      </p>
      {query.isPending ? (
        <p className="mt-2 text-[0.8125rem] text-muted-foreground">Loading…</p>
      ) : query.isError ? (
        <p className="mt-2 text-[0.8125rem] text-muted-foreground">
          Unable to load licence request history.
        </p>
      ) : items.length === 0 ? (
        <p className="mt-2 text-[0.8125rem] text-muted-foreground">
          No licence requests yet.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border-subtle rounded-lg border border-border-subtle">
          {items.map((request) => (
            <li
              key={request.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2"
            >
              <span className="text-[0.8125rem] font-medium tabular-nums text-foreground">
                {request.reference}
              </span>
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-muted-foreground">
                {requestSummary(request)}
              </span>
              <span className="text-[0.75rem] tabular-nums text-muted-foreground">
                {new Date(request.createdAt).toLocaleDateString()}
              </span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium",
                  STATUS_STYLES[request.status]
                )}
              >
                {request.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
