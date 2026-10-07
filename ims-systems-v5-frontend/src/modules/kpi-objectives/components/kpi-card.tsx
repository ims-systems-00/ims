import { useState, type FormEvent } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { StatusBadge } from "@/shared/components/status-badge";
import { useUserQuery } from "@/modules/users/hooks/use-users";
import { cn } from "@/shared/lib/utils";
import { updateKpiObjectiveFormSchema } from "../schemas";
import type { KpiObjective } from "../types";

function formatCreatedOn(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type KpiCardProps = {
  kpi: KpiObjective;
  canManage: boolean;
  unitName?: string;
  pendingUpdate?: boolean;
  pendingDelete?: boolean;
  onUpdate: (value: string) => Promise<void>;
  onDelete: () => void;
};

export function KpiCard({
  kpi,
  canManage,
  unitName,
  pendingUpdate,
  pendingDelete,
  onUpdate,
  onDelete,
}: KpiCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(kpi.value);
  const [error, setError] = useState<string | undefined>();
  const creatorQuery = useUserQuery(kpi.createdBy, Boolean(kpi.createdBy));
  const creatorName =
    creatorQuery.data?.user.name ?? kpi.createdBy.slice(0, 10);

  async function handleUpdate(event: FormEvent) {
    event.preventDefault();
    const parsed = updateKpiObjectiveFormSchema.safeParse({ value: draft });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid value");
      return;
    }
    setError(undefined);
    await onUpdate(parsed.data.value);
    setEditing(false);
  }

  return (
    <article
      className={cn(
        "rounded-lg border border-border bg-surface px-4 py-3.5",
        "shadow-xs"
      )}
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[0.75rem] font-medium tracking-tight text-foreground">
              {kpi.reference}
            </span>
            <StatusBadge
              tone={kpi.privacy === "Organisational" ? "info" : "neutral"}
            >
              {kpi.privacy}
            </StatusBadge>
            {unitName ? (
              <span className="text-[0.75rem] text-muted-foreground">
                {unitName}
              </span>
            ) : null}
          </div>
          <p className="text-[0.75rem] text-muted-foreground">
            {creatorName} · {formatCreatedOn(kpi.createdOn)}
          </p>
        </div>
        {canManage && !editing ? (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Edit ${kpi.reference}`}
              onClick={() => {
                setDraft(kpi.value);
                setEditing(true);
              }}
            >
              <Pencil className="size-3.5" aria-hidden />
              Edit
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              aria-label={`Delete ${kpi.reference}`}
              disabled={pendingDelete}
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" aria-hidden />
              Delete
            </Button>
          </div>
        ) : null}
      </header>

      {editing ? (
        <form className="space-y-3" onSubmit={(event) => void handleUpdate(event)}>
          <FormField
            label="KPI/Objective"
            htmlFor={`edit-kpi-${kpi.id}`}
            required
            error={error}
          >
            <Textarea
              id={`edit-kpi-${kpi.id}`}
              value={draft}
              rows={4}
              disabled={pendingUpdate}
              onChange={(event) => setDraft(event.target.value)}
            />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={pendingUpdate}>
              {pendingUpdate ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Updating…
                </>
              ) : (
                "Update"
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pendingUpdate}
              onClick={() => {
                setEditing(false);
                setDraft(kpi.value);
                setError(undefined);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {kpi.value}
        </p>
      )}
    </article>
  );
}
