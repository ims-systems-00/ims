import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type OwnerOption = {
  id: string;
  label: string;
  email?: string;
};

type OwnerMultiSelectProps = {
  options: OwnerOption[];
  value: string[];
  onChange: (next: string[]) => void;
  loading?: boolean;
  max?: number;
  /** When false (default), at least one selection is kept. */
  allowEmpty?: boolean;
  error?: string;
  emptyMessage?: string;
};

/**
 * Checkbox list for selecting document / repository owners.
 */
export function OwnerMultiSelect({
  options,
  value,
  onChange,
  loading = false,
  max = 5,
  allowEmpty = false,
  error,
  emptyMessage = "No users found. Seed demo users or create users first.",
}: OwnerMultiSelectProps) {
  function toggle(userId: string) {
    if (value.includes(userId)) {
      if (!allowEmpty && value.length === 1) return;
      onChange(value.filter((id) => id !== userId));
      return;
    }
    if (value.length >= max) return;
    onChange([...value, userId]);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Loading users…
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border-subtle px-3 py-3 text-[0.75rem] text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-border-subtle p-2">
        {options.map((user) => {
          const selected = value.includes(user.id);
          const atLimit = !selected && value.length >= max;
          return (
            <label
              key={user.id}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                selected
                  ? "bg-primary/10 text-foreground"
                  : "hover:bg-muted/50",
                atLimit && "cursor-not-allowed opacity-50"
              )}
            >
              <input
                type="checkbox"
                className="size-3.5 accent-primary"
                checked={selected}
                disabled={atLimit}
                onChange={() => toggle(user.id)}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{user.label}</span>
                {user.email ? (
                  <span className="block truncate text-[0.6875rem] text-muted-foreground">
                    {user.email}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p className="text-[0.75rem] text-destructive">{error}</p>
      ) : (
        <p className="text-[0.75rem] text-muted-foreground">
          Select up to {max} owner{max === 1 ? "" : "s"}.
        </p>
      )}
    </div>
  );
}
