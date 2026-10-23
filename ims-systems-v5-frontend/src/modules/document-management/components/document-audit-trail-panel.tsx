import { Loader2 } from "lucide-react";
import { useActivitiesQuery } from "@/modules/activities";
import { formatDocumentDate } from "../lib/format";

/**
 * Audit trail tab: automated + manual activity records for this
 * document node rendered as an event table (same Activities source
 * as the timeline — V5 has no separate audit stream).
 */
export function DocumentAuditTrailPanel({
  nodeId,
  userNames,
}: {
  nodeId: string;
  userNames: Record<string, string>;
}) {
  const query = useActivitiesQuery({
    page: 1,
    pageSize: 100,
    moduleType: "documenttrees",
    moduleId: nodeId,
    sort: "createdOn",
    sortDir: "desc",
  });

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-card px-4 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading audit trail…
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="rounded-xl border border-border-subtle bg-card px-4 py-10 text-sm text-muted-foreground">
        Audit trail could not be loaded.
      </div>
    );
  }

  const items = query.data.items;
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Event</th>
            <th className="px-4 py-3 font-medium">Actor</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-border-subtle last:border-0"
            >
              <td className="px-4 py-3">{item.value}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {userNames[item.createdBy] ?? item.createdBy}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {item.isAutomated ? "System" : "Comment"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDocumentDate(item.createdOn)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted-foreground">
          No audit events recorded for this document yet.
        </p>
      ) : null}
    </div>
  );
}
