import { useUserQuery } from "@/modules/users/hooks/use-users";
import { OfiStatusBadge } from "./ofi-badges";
import type { Ofi } from "../types";

type OfiLifecyclePanelProps = {
  ofi: Ofi;
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActorLabel({ userId }: { userId?: string | null }) {
  const query = useUserQuery(userId ?? undefined, Boolean(userId));
  if (!userId) return <span className="text-muted-foreground">—</span>;
  return <>{query.data?.user.name ?? userId.slice(0, 8)}</>;
}

type LifecycleStep = {
  id: string;
  label: string;
  done: boolean;
  on: string | null;
  by: string | null;
};

function buildSteps(ofi: Ofi): LifecycleStep[] {
  const status = ofi.implemented.status;
  const inProgress = status === "In Progress" || status === "Implemented";
  const implemented = status === "Implemented";

  return [
    {
      id: "raised",
      label: "Raised",
      done: true,
      on: ofi.createdOn,
      by: ofi.createdBy,
    },
    {
      id: "in_progress",
      label: "In Progress",
      done: inProgress,
      on: inProgress ? (ofi.updatedOn ?? ofi.implemented.on) : null,
      by: null,
    },
    {
      id: "implemented",
      label: "Implemented",
      done: implemented,
      on: ofi.implemented.on,
      by: ofi.implemented.by,
    },
  ];
}

/**
 * OFI lifecycle tab — raised / in progress / implemented timeline.
 */
export function OfiLifecyclePanel({ ofi }: OfiLifecyclePanelProps) {
  const steps = buildSteps(ofi);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="ims-text-meta">Current status</span>
        <OfiStatusBadge status={ofi.displayStatus} />
      </div>

      <ol className="relative space-y-0 border-l border-border-subtle pl-4">
        {steps.map((step) => (
          <li key={step.id} className="relative pb-5 last:pb-0">
            <span
              className={
                step.done
                  ? "absolute -left-[1.3rem] top-1 size-2.5 rounded-full bg-foreground"
                  : "absolute -left-[1.3rem] top-1 size-2.5 rounded-full border border-border bg-surface"
              }
              aria-hidden
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p
                  className={
                    step.done
                      ? "text-sm font-medium text-foreground"
                      : "text-sm font-medium text-muted-foreground"
                  }
                >
                  {step.label}
                </p>
                <p className="ims-text-meta">
                  {step.done
                    ? step.on
                      ? formatDateTime(step.on)
                      : "—"
                    : "Not yet"}
                </p>
              </div>
              {step.done && step.by ? (
                <p className="text-sm text-muted-foreground">
                  By <ActorLabel userId={step.by} />
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
