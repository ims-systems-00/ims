import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

type EntityTableRowProps = {
  children: ReactNode;
  onOpen?: () => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Clickable entity table row — opens the details sheet.
 * Interactive controls inside the row must stopPropagation
 * (RowActionsMenu already does this).
 */
export function EntityTableRow({
  children,
  onOpen,
  disabled = false,
  className,
}: EntityTableRowProps) {
  const interactive = Boolean(onOpen) && !disabled;

  function handleClick(event: MouseEvent<HTMLTableRowElement>) {
    if (!interactive) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, a, input, select, textarea, [role='menuitem']")) {
      return;
    }
    onOpen?.();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (!interactive) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen?.();
    }
  }

  return (
    <tr
      className={cn(className)}
      data-interactive={interactive ? "true" : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? "button" : undefined}
      aria-disabled={disabled || undefined}
    >
      {children}
    </tr>
  );
}
