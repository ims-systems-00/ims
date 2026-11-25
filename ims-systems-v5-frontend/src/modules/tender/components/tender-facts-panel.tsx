import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/toast";
import {
  useTenderSettingsQuery,
  useUpdateTenderFactsMutation,
} from "../hooks/use-tender";

type TenderFactsPanelProps = {
  canEdit?: boolean;
};

type FactRow = { key: string; value: string };

export function TenderFactsPanel({ canEdit = true }: TenderFactsPanelProps) {
  const settingsQuery = useTenderSettingsQuery();
  const updateMutation = useUpdateTenderFactsMutation();
  const [rows, setRows] = useState<FactRow[]>([]);

  useEffect(() => {
    const facts = settingsQuery.data?.facts;
    if (!facts) return;
    const next = Object.entries(facts).map(([key, value]) => ({
      key,
      value,
    }));
    setRows(next.length ? next : [{ key: "", value: "" }]);
  }, [settingsQuery.data]);

  if (settingsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading facts…
      </div>
    );
  }

  if (!settingsQuery.data) {
    return (
      <EmptyState
        title="Facts unavailable"
        description="Could not load organisation facts."
      />
    );
  }

  async function handleSave() {
    const facts: Record<string, string> = {};
    for (const row of rows) {
      const key = row.key.trim();
      if (!key) continue;
      facts[key] = row.value;
    }
    try {
      await updateMutation.mutateAsync(facts);
      notify.success("Facts saved");
    } catch (error) {
      notify.fromError(error, "Unable to save facts");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Company facts</h2>
        <p className="text-sm text-muted-foreground">
          Key/value facts used for {"{{fact}}"} substitution when drafting
          answers.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-border-subtle bg-card p-4">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="grid gap-2 sm:grid-cols-[minmax(8rem,14rem)_1fr_auto]"
          >
            <FormField label={idx === 0 ? "Key" : " "}>
              <Input
                placeholder="e.g. employees"
                value={row.key}
                disabled={!canEdit || updateMutation.isPending}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, i) =>
                      i === idx ? { ...r, key: e.target.value } : r
                    )
                  )
                }
              />
            </FormField>
            <FormField label={idx === 0 ? "Value" : " "}>
              <Input
                placeholder="Value"
                value={row.value}
                disabled={!canEdit || updateMutation.isPending}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, i) =>
                      i === idx ? { ...r, value: e.target.value } : r
                    )
                  )
                }
              />
            </FormField>
            {canEdit ? (
              <div className="pt-6">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={updateMutation.isPending}
                  onClick={() =>
                    setRows((prev) => prev.filter((_, i) => i !== idx))
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ) : null}
          </div>
        ))}

        {canEdit ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setRows((prev) => [...prev, { key: "", value: "" }])}
          >
            <Plus className="size-3.5" />
            Add fact
          </Button>
        ) : null}
      </div>

      {canEdit ? (
        <Button
          type="button"
          disabled={updateMutation.isPending}
          onClick={() => void handleSave()}
        >
          {updateMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          Save facts
        </Button>
      ) : null}
    </div>
  );
}
