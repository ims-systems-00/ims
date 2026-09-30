import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";

export type RowActionItem = {
  id: string;
  label: string;
  onSelect: () => void;
  /** Visual treatment for destructive actions (e.g. Delete). */
  variant?: "default" | "destructive";
  disabled?: boolean;
  icon?: ReactNode;
};

type RowActionsMenuProps = {
  actions: RowActionItem[];
  /** Accessible name for the trigger button. */
  label?: string;
  align?: "start" | "center" | "end";
  className?: string;
};

/**
 * Shared Actions-column menu for entity tables.
 * Use for Details / Delete / future row actions across modules.
 * Stops event propagation so row-click does not open the details sheet.
 */
export function RowActionsMenu({
  actions,
  label = "Open row actions",
  align = "end",
  className,
}: RowActionsMenuProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            "ims-row-actions text-muted-foreground hover:opacity-100",
            className
          )}
          aria-label={label}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} onClick={(event) => event.stopPropagation()}>
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.id}
            disabled={action.disabled}
            variant={action.variant}
            onSelect={(event) => {
              event.preventDefault();
              action.onSelect();
            }}
          >
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
