import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type DashboardKpiCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  className?: string;
  /**
   * Visual weight — featured KPIs (open tasks, risks) read louder than
   * structural counts (premises, compliance bodies).
   */
  emphasis?: "default" | "featured" | "muted";
};

const emphasisClass: Record<
  NonNullable<DashboardKpiCardProps["emphasis"]>,
  string
> = {
  default:
    "border-border bg-surface hover:bg-accent/35",
  featured:
    "border-border bg-surface shadow-sm ring-1 ring-border-subtle hover:bg-accent/30",
  muted:
    "border-border-subtle bg-surface-muted/40 hover:bg-surface-muted/70",
};

const valueClass: Record<
  NonNullable<DashboardKpiCardProps["emphasis"]>,
  string
> = {
  default: "text-2xl",
  featured: "text-[1.75rem] tracking-tight",
  muted: "text-xl",
};

export function DashboardKpiCard({
  label,
  value,
  hint,
  href,
  className,
  emphasis = "default",
}: DashboardKpiCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.07em] text-muted-foreground">
          {label}
        </p>
        {href ? (
          <ArrowUpRight
            className="size-3.5 shrink-0 text-muted-foreground/70"
            aria-hidden
          />
        ) : null}
      </div>
      <p
        className={cn(
          "mt-2 font-semibold tabular-nums text-foreground",
          valueClass[emphasis]
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-[0.6875rem] leading-snug text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </>
  );

  const shell = cn(
    "block rounded-lg border px-4 py-3.5 transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
    emphasisClass[emphasis],
    className
  );

  if (href) {
    return (
      <Link to={href} className={shell}>
        {body}
      </Link>
    );
  }

  return <div className={shell}>{body}</div>;
}
