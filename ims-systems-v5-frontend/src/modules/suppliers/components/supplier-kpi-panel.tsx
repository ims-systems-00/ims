import { useState, type FormEvent } from "react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  useAddSupplierKpiMutation,
  useRemoveSupplierKpiMutation,
} from "../hooks/use-suppliers";
import { kpiObjectiveFormSchema } from "../schemas";
import type { Supplier } from "../types";

type SupplierKpiPanelProps = {
  supplier: Supplier;
};

/**
 * Supplier KPI/Objectives tab — embedded free-text expectations on the supplier.
 */
export function SupplierKpiPanel({ supplier }: SupplierKpiPanelProps) {
  const [kpiValue, setKpiValue] = useState("");
  const [kpiError, setKpiError] = useState<string | undefined>();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const addKpi = useAddSupplierKpiMutation(supplier.id);
  const removeKpi = useRemoveSupplierKpiMutation(supplier.id);

  async function handleAddKpi(event: FormEvent) {
    event.preventDefault();
    const parsed = kpiObjectiveFormSchema.safeParse({ value: kpiValue });
    if (!parsed.success) {
      setKpiError(parsed.error.issues[0]?.message ?? "Invalid KPI");
      return;
    }
    setKpiError(undefined);
    try {
      await addKpi.mutateAsync(parsed.data.value);
      setKpiValue("");
      notify.success("KPI objective added");
    } catch (error) {
      notify.fromError(error, "Unable to add KPI objective");
    }
  }

  return (
    <section className="space-y-3">
      <h3 className="ims-text-section border-b border-border-subtle pb-2">
        KPI objectives
      </h3>
      <p className="ims-text-meta">
        Free-text expectations only — not measured automatically.
      </p>
      {supplier.kpiObjectives.length === 0 ? (
        <p className="ims-text-meta">No KPI objectives.</p>
      ) : (
        <ul className="space-y-2">
          {supplier.kpiObjectives.map((kpi) => (
            <li
              key={kpi.id}
              className="flex items-start justify-between gap-2 rounded-sm border border-border-subtle px-3 py-2 text-sm"
            >
              <p className="whitespace-pre-wrap">{kpi.value}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={removeKpi.isPending && removingId === kpi.id}
                onClick={() => {
                  setRemovingId(kpi.id);
                  void removeKpi
                    .mutateAsync(kpi.id)
                    .then(() => notify.success("KPI objective removed"))
                    .catch((error) =>
                      notify.fromError(error, "Unable to remove KPI")
                    )
                    .finally(() => setRemovingId(null));
                }}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="space-y-3 rounded-sm border border-border-subtle p-3"
        onSubmit={(e) => void handleAddKpi(e)}
      >
        <FormField label="KPI / objective" required error={kpiError}>
          <textarea
            className="ims-field min-h-[4rem] py-2 leading-relaxed"
            value={kpiValue}
            disabled={addKpi.isPending}
            onChange={(event) => setKpiValue(event.target.value)}
          />
        </FormField>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={addKpi.isPending}>
            {addKpi.isPending ? "Adding…" : "Add KPI"}
          </Button>
        </div>
      </form>
    </section>
  );
}
