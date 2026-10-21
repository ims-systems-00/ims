import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/** Shared premium-minimal building blocks for the onboarding pages. */

export function OnboardHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2 text-center">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-primary">
        {eyebrow}
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
        {title}
      </h1>
      <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function OnboardCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_color-mix(in_oklch,var(--foreground)_4%,transparent),0_12px_32px_-16px_color-mix(in_oklch,var(--foreground)_12%,transparent)]",
        className
      )}
    >
      {children}
    </section>
  );
}

export function OnboardCardHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border-subtle px-5 py-4 md:px-6">
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-muted text-muted-foreground"
      >
        {icon}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-semibold tracking-tight text-foreground">
          {title}
        </span>
        {description ? (
          <span className="mt-0.5 block text-[0.75rem] text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </div>
  );
}
