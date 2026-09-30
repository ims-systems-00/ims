import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "destructive" | "info";
  className?: string;
};

const toneClass: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  neutral: "border-transparent bg-surface-muted text-muted-foreground",
  success: "border-transparent bg-success/12 text-success",
  warning: "border-transparent bg-warning/18 text-warning-foreground",
  destructive: "border-transparent bg-destructive/10 text-destructive",
  info: "border-transparent bg-info/12 text-info",
};

/**
 * Compact status indicator for tables and detail views.
 * Colour is supported by text — do not rely on colour alone.
 */
export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[0.6875rem] font-medium tracking-[0.01em]",
        toneClass[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
