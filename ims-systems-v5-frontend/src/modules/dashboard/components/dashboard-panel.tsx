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
  /**
   * featured — primary analytics (risk trends)
   * default — standard module panel
   * compact — secondary / lower-priority tiles
   */
  emphasis?: "default" | "featured" | "compact";
};

const shellClass: Record<
  NonNullable<DashboardPanelProps["emphasis"]>,
  string
> = {
  default: "border-border bg-surface",
  featured: "border-border bg-surface shadow-sm ring-1 ring-border-subtle",
  compact: "border-border-subtle bg-surface",
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
  emphasis = "default",
}: DashboardPanelProps) {
  const headingId = `panel-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col rounded-lg border",
        shellClass[emphasis],
        className
      )}
      aria-labelledby={headingId}
    >
      <header
        className={cn(
          "flex flex-wrap items-start justify-between gap-2 border-b border-border-subtle",
          emphasis === "compact" ? "px-3.5 py-2.5" : "px-4 py-3.5"
        )}
      >
        <div className="min-w-0 space-y-0.5">
          <h2
            id={headingId}
            className={cn(
              "font-semibold tracking-tight text-foreground",
              emphasis === "featured" ? "text-[0.9375rem]" : "text-sm"
            )}
          >
            {title}
          </h2>
          {description ? (
            <p className="max-w-prose text-[0.75rem] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {href ? (
          <Link
            to={href}
            className="shrink-0 text-[0.75rem] font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {hrefLabel}
          </Link>
        ) : null}
      </header>

      <div
        className={cn(
          "flex flex-1 flex-col",
          emphasis === "compact" ? "px-3.5 py-3" : "px-4 py-4"
        )}
      >
        {isLoading ? (
          <div
            className="flex flex-1 items-center gap-2 py-8 text-sm text-muted-foreground"
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
