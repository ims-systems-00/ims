import { StatusBadge } from "@/shared/components/status-badge";
import { HEALTH_LABELS, HEALTH_TONES } from "../lib/health";
import type { ClauseHealthStatus } from "../types";

/** Status pill for a clause's live health. Text always accompanies colour. */
export function ClauseHealthChip({
  status,
  className,
}: {
  status: ClauseHealthStatus;
  className?: string;
}) {
  return (
    <StatusBadge tone={HEALTH_TONES[status]} className={className}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {HEALTH_LABELS[status]}
    </StatusBadge>
  );
}
