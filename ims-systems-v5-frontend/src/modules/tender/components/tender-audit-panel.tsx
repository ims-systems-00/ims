import { EmptyState } from "@/shared/components/empty-state";
import { useTenderLogQuery } from "../hooks/use-tender";
import { formatWhen } from "../lib/tender-display";
import { PageLoader } from "@/shared/components/ims-loader";

export function TenderAuditPanel() {
  const logQuery = useTenderLogQuery();
  const entries = logQuery.data ?? [];

  if (logQuery.isLoading) {
    return (
      <PageLoader label="Loading audit log…" />
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No audit entries yet"
        description="Library changes, drafting and submissions will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Audit log</h2>
        <p className="text-sm text-muted-foreground">
          Recent tender activity for auditor evidence.
        </p>
      </div>
      <div className="space-y-2 rounded-xl border border-border-subtle bg-card p-4">
        {entries.map((h, idx) => (
          <div
            key={`${h.t}-${idx}`}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm"
          >
            <span className="text-xs text-muted-foreground">
              {formatWhen(h.t)}
            </span>
            <span className="font-medium">{h.by}</span>
            <span className="text-muted-foreground">{h.what}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
