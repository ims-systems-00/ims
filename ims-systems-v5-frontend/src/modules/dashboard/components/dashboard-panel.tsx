import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { isApiClientError } from "@/shared/lib/http/errors";
import { EmptyState } from "@/shared/components/empty-state";

type DashboardPanelProps = {
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  children?: ReactNode;
  className?: string;
};

export function DashboardPanel({
  title,
  description,
  href,
  hrefLabel = "Open module",
  isLoading,
  isError,
  error,
  children,
  className,
}: DashboardPanelProps) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-md border border-border bg-surface",
        className
      )}
      aria-labelledby={`panel-${title.replace(/\s+/g, "-").toLowerCase()}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border-subtle px-4 py-3">
        <div className="min-w-0 space-y-0.5">
          <h2
            id={`panel-${title.replace(/\s+/g, "-").toLowerCase()}`}
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
          {description ? (
            <p className="text-[0.75rem] text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {href ? (
          <Link
            to={href}
            className="text-[0.75rem] font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {hrefLabel}
          </Link>
        ) : null}
      </header>

      <div className="flex-1 px-4 py-3">
        {isLoading ? (
          <div
            className="flex items-center gap-2 py-6 text-sm text-muted-foreground"
            aria-busy="true"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading…
          </div>
        ) : null}

        {isError ? (
          <p className="ims-alert ims-alert-error text-sm" role="alert">
            {isApiClientError(error)
              ? error.message
              : "Unable to load this panel."}
          </p>
        ) : null}

        {!isLoading && !isError ? children : null}
      </div>
    </section>
  );
}

export function DashboardUnavailableState({
  title = "Data unavailable",
  description = "This metric is not available yet in V5.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState title={title} description={description} className="py-6" />
  );
}

export function DashboardEmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <EmptyState title={title} description={description} className="py-6" />
  );
}
