import { cn } from "@/shared/lib/utils";
import { HEALTH_TEXT_CLASS } from "../lib/health";
import type { ClauseHealthStatus } from "../types";

type HealthRingProps = {
  percentage: number;
  worst: ClauseHealthStatus;
  size?: number;
  /** Stroke width in viewBox units (74). Thinner reads lighter. */
  thickness?: number;
  /** Show the percentage inside the ring (hide for very small rings). */
  label?: boolean;
  className?: string;
};

/**
 * Circular progress ring coloured by the worst clause status (not by the
 * percentage): a 95% standard with one lapsed clause still shows red.
 */
export function HealthRing({
  percentage,
  worst,
  size = 72,
  thickness = 5,
  label = true,
  className,
}: HealthRingProps) {
  const r = 37 - thickness / 2 - 1;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Math.round(percentage)));
  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${pct}% compliant today`}
    >
      <svg viewBox="0 0 74 74" width={size} height={size} aria-hidden>
        <circle
          cx="37"
          cy="37"
          r={r}
          fill="none"
          strokeWidth={thickness}
          className="stroke-border-subtle"
        />
        <circle
          cx="37"
          cy="37"
          r={r}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={`${(c * pct) / 100} ${c}`}
          transform="rotate(-90 37 37)"
          className={cn(
            "transition-[stroke-dasharray] duration-700 ease-out motion-reduce:transition-none",
            HEALTH_TEXT_CLASS[worst]
          )}
        />
      </svg>
      {label ? (
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center font-semibold tabular-nums tracking-tight text-foreground"
          style={{ fontSize: Math.max(11, Math.round(size * 0.24)) }}
        >
          {pct}%
        </span>
      ) : null}
    </div>
  );
}
