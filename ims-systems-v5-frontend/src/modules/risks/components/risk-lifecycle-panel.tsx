import { useUserQuery } from "@/modules/users/hooks/use-users";
import { RiskStatusBadge } from "./risk-badges";
import type { LifecycleFlag, Risk } from "../types";

type RiskLifecyclePanelProps = {
  risk: Risk;
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
  detail?: string | null;
};

function buildSteps(risk: Risk): LifecycleStep[] {
  const flag = (value: LifecycleFlag) => ({
    done: value.status,
    on: value.on,
    by: value.by,
  });

  return [
    {
      id: "raised",
      label: "Raised",
      done: true,
      on: risk.raisedOn,
      by: risk.raisedBy,
    },
    {
      id: "escalated",
      label: "Escalated",
      ...flag(risk.escalated),
    },
    {
      id: "mitigated",
      label: "Mitigated",
      ...flag(risk.mitigated),
      detail: risk.mitigationText?.trim() || null,
    },
    {
      id: "accepted",
      label: "Accepted",
      ...flag(risk.accepted),
      detail:
        [
          risk.acceptanceRationale?.trim(),
          risk.decisionMaker?.trim()
            ? `Decision maker: ${risk.decisionMaker.trim()}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ") || null,
    },
  ];
}

/**
 * Risk lifecycle tab — raised / escalated / mitigated / accepted timeline.
 */
export function RiskLifecyclePanel({ risk }: RiskLifecyclePanelProps) {
  const steps = buildSteps(risk);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="ims-text-meta">Current status</span>
        <RiskStatusBadge status={risk.displayStatus} />
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
                  {step.done ? formatDateTime(step.on) : "Not yet"}
                </p>
              </div>
              {step.done ? (
                <p className="text-sm text-muted-foreground">
                  By <ActorLabel userId={step.by} />
                </p>
              ) : null}
              {step.done && step.detail ? (
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {step.detail}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
