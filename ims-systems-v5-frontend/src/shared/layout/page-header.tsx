import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

/**
 * Optional page header for module pages rendered inside the shell.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-border-subtle pb-4",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="ims-text-page-title">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-[0.8125rem] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

type MainContentProps = {
  children: ReactNode;
  className?: string;
};

export function MainContent({ children, className }: MainContentProps) {
  return (
    <div className={cn("ims-page", className)}>{children}</div>
  );
}
