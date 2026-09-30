import { Link } from "react-router-dom";
import { cn } from "@/shared/lib/utils";

type DashboardKpiCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  className?: string;
};

export function DashboardKpiCard({
  label,
  value,
  hint,
  href,
  className,
}: DashboardKpiCardProps) {
  const body = (
    <>
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[0.6875rem] text-muted-foreground">{hint}</p>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        className={cn(
          "block rounded-md border border-border bg-surface px-3.5 py-3",
          "transition-colors hover:bg-accent/40 focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring/40",
          className
        )}
      >
        {body}
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-surface px-3.5 py-3",
        className
      )}
    >
      {body}
    </div>
  );
}
