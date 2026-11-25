import { useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { formatDate } from "../lib/training-display";
import {
  usePeopleQuery,
  useTrainingPlanQuery,
} from "../hooks/use-training";

type TrainingPlanPanelProps = {
  onBookSession: (cid: string, attendeeIds: string[]) => void;
  canCreate?: boolean;
};

export function TrainingPlanPanel({
  onBookSession,
  canCreate = true,
}: TrainingPlanPanelProps) {
  const [months, setMonths] = useState(3);
  const planQuery = useTrainingPlanQuery(months);
  const peopleQuery = usePeopleQuery({ status: "Active" });
  const groups = planQuery.data ?? [];
  const people = peopleQuery.data ?? [];
  const nameOf = (id: string) =>
    people.find((p) => p.id === id)?.name ?? id;

  if (planQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading plan…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Training plan
          </h2>
          <p className="text-sm text-muted-foreground">
            Mandatory gaps and renewals grouped by course for the next{" "}
            {months} months.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          Horizon
          <select
            className="ims-select ims-field-sm w-auto"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          >
            <option value={1}>1 month</option>
            <option value={3}>3 months</option>
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
          </select>
        </label>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="Nothing to plan"
          description="No mandatory gaps or renewals in this horizon."
        />
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div
              key={g.cid}
              className="rounded-xl border border-border-subtle bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">{g.competency}</h3>
                  <p className="text-xs text-muted-foreground">
                    Soonest need: {formatDate(g.soonest)} · {g.people.length}{" "}
                    people · {g.unbooked.length} unbooked
                  </p>
                </div>
                {canCreate && g.unbooked.length > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onBookSession(g.cid, g.unbooked)}
                  >
                    <BookOpen className="size-3.5" /> Book session
                  </Button>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {g.people.map((pid) => {
                  const unbooked = g.unbooked.includes(pid);
                  return (
                    <span
                      key={pid}
                      className={
                        unbooked
                          ? "rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-800 dark:text-amber-300"
                          : "rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      }
                    >
                      {nameOf(pid)}
                      {unbooked ? "" : " · booked"}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
