import { Loader2, Plus } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { Button } from "@/shared/components/ui/button";
import {
  useCompetenciesQuery,
  useSessionsQuery,
} from "../hooks/use-training";
import { formatDate } from "../lib/training-display";
import { TrainingSessionStatusBadge } from "./training-badges";

type TrainingSessionsPanelProps = {
  onOpenSession: (id: string) => void;
  onCreate: () => void;
  canCreate?: boolean;
};

export function TrainingSessionsPanel({
  onOpenSession,
  onCreate,
  canCreate = true,
}: TrainingSessionsPanelProps) {
  const sessionsQuery = useSessionsQuery();
  const compsQuery = useCompetenciesQuery();
  const sessions = sessionsQuery.data ?? [];
  const comps = compsQuery.data ?? [];
  const compName = (cid: string) =>
    comps.find((c) => c.id === cid || c.key === cid)?.name ?? cid;

  if (sessionsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading sessions…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="ims-toolbar flex-wrap">
        <div className="flex-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Sessions & bookings
          </h2>
          <p className="text-sm text-muted-foreground">
            Plan courses, send invites, capture RSVPs and complete attendance.
          </p>
        </div>
        {canCreate ? (
          <Button type="button" size="sm" onClick={onCreate}>
            <Plus className="size-3.5" /> Plan session
          </Button>
        ) : null}
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          title="No sessions"
          description="Plan a session from the training plan or create one here."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="ims-table w-full">
            <thead>
              <tr>
                <th>Course</th>
                <th>Date</th>
                <th>Location</th>
                <th>Attendees</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const accepted = Object.values(s.rsvp || {}).filter(
                  (r) => r.status === "accepted"
                ).length;
                return (
                  <EntityTableRow
                    key={s.id}
                    onOpen={() => onOpenSession(s.id)}
                  >
                    <td>
                      <div className="font-medium">{compName(s.cid)}</div>
                      {s.trainer ? (
                        <div className="ims-text-meta">{s.trainer}</div>
                      ) : null}
                    </td>
                    <td>
                      {formatDate(s.date)}
                      {s.time ? (
                        <span className="ims-text-meta"> · {s.time}</span>
                      ) : null}
                    </td>
                    <td>{s.location || "—"}</td>
                    <td className="text-sm">
                      {(s.attendees || []).length}
                      {accepted ? (
                        <span className="ims-text-meta">
                          {" "}
                          · {accepted} accepted
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <TrainingSessionStatusBadge status={s.status} />
                    </td>
                  </EntityTableRow>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
