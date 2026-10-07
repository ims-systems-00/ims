import { useMemo, useState } from "react";
import { Loader2, Target } from "lucide-react";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/layout";
import { cn } from "@/shared/lib/utils";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import { DEV_STUB_IDENTITY } from "@/security";
import { useFunctionalUnitsQuery } from "@/modules/functional-units/hooks/use-functional-units";
import { KpiCard } from "../components/kpi-card";
import { KpiCreateForm } from "../components/kpi-create-form";
import {
  useCreateKpiObjectiveMutation,
  useDeleteKpiObjectiveMutation,
  useKpiObjectivesQuery,
  useUpdateKpiObjectiveMutation,
} from "../hooks/use-kpi-objectives";
import type { CreateKpiObjectiveInput, KpiObjective } from "../types";

type TabId = "organisation" | "business-units" | "add";

type PendingDelete = { id: string; label: string };

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "organisation", label: "Organisation" },
  { id: "business-units", label: "Business units" },
  { id: "add", label: "Add KPI" },
];

/**
 * Reviews → KPI/Objectives.
 * Spec: docs/module-specifications/kpi-objective.md
 */
export function KpiObjectivesPage() {
  const subjectId = DEV_STUB_IDENTITY.subjectId;
  const [tab, setTab] = useState<TabId>("organisation");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const listQuery = useKpiObjectivesQuery({
    page: 1,
    pageSize: 200,
    sort: "createdOn",
    sortDir: "desc",
  });
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  const createMutation = useCreateKpiObjectiveMutation();
  const updateMutation = useUpdateKpiObjectiveMutation();
  const deleteMutation = useDeleteKpiObjectiveMutation();

  const unitNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const unit of unitsQuery.data?.items ?? []) {
      map.set(unit.id, unit.name);
    }
    return map;
  }, [unitsQuery.data]);

  const organisational = useMemo(
    () =>
      (listQuery.data?.items ?? []).filter(
        (kpi) => kpi.privacy === "Organisational"
      ),
    [listQuery.data]
  );

  const businessUnitKpis = useMemo(
    () =>
      (listQuery.data?.items ?? []).filter(
        (kpi) =>
          kpi.privacy === "Business unit" &&
          (!selectedUnitId || kpi.businessUnitId === selectedUnitId)
      ),
    [listQuery.data, selectedUnitId]
  );

  async function handleCreate(values: CreateKpiObjectiveInput) {
    try {
      await createMutation.mutateAsync(values);
      notify.success("KPI/Objective added");
      setTab(
        values.privacy === "Business unit" ? "business-units" : "organisation"
      );
      if (values.privacy === "Business unit" && values.businessUnitId) {
        setSelectedUnitId(values.businessUnitId);
      }
    } catch (error) {
      notify.fromError(error, "Unable to add KPI/Objective");
      throw error;
    }
  }

  async function handleUpdate(kpi: KpiObjective, value: string) {
    setUpdatingId(kpi.id);
    try {
      await updateMutation.mutateAsync({ id: kpi.id, body: { value } });
      notify.success("KPI/Objective updated");
    } catch (error) {
      notify.fromError(error, "Unable to update KPI/Objective");
      throw error;
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      notify.success("KPI/Objective removed");
      setPendingDelete(null);
    } catch (error) {
      notify.fromError(error, "Unable to delete KPI/Objective");
    }
  }

  function renderCards(items: KpiObjective[], emptyTitle: string, emptyDescription?: string) {
    if (listQuery.isLoading) {
      return (
        <div
          className="flex items-center gap-2 py-10 text-sm text-muted-foreground"
          aria-busy="true"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading KPI/Objectives…
        </div>
      );
    }

    if (listQuery.isError) {
      return (
        <p className="ims-alert ims-alert-error" role="alert">
          {isApiClientError(listQuery.error)
            ? listQuery.error.message
            : "Unable to load KPI/Objectives."}
        </p>
      );
    }

    if (items.length === 0) {
      return (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      );
    }

    return (
      <ul className="space-y-3" aria-label="KPI objectives">
        {items.map((kpi) => (
          <li key={kpi.id}>
            <KpiCard
              kpi={kpi}
              canManage={kpi.createdBy === subjectId}
              unitName={
                kpi.businessUnitId
                  ? unitNameById.get(kpi.businessUnitId)
                  : undefined
              }
              pendingUpdate={
                updateMutation.isPending && updatingId === kpi.id
              }
              pendingDelete={
                deleteMutation.isPending && pendingDelete?.id === kpi.id
              }
              onUpdate={(value) => handleUpdate(kpi, value)}
              onDelete={() =>
                setPendingDelete({
                  id: kpi.id,
                  label: kpi.reference,
                })
              }
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="KPI/Objectives"
        description="Organisation and business-unit objective statements used across Reviews, Audits, and reporting."
      />

      <div
        className="flex flex-wrap gap-1 border-b border-border-subtle"
        role="tablist"
        aria-label="KPI/Objectives views"
      >
        {TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={cn(
                "relative px-3.5 py-2.5 text-sm font-medium transition-colors",
                selected
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTab(item.id)}
            >
              {item.label}
              {selected ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "organisation" ? (
        <section aria-label="Organisation KPIs" className="space-y-3">
          <div className="flex items-center gap-2 text-[0.75rem] text-muted-foreground">
            <Target className="size-3.5" aria-hidden />
            Organisational statements
          </div>
          {renderCards(
            organisational,
            "Your organisation has no KPI/Objective(s) set up.",
            "Use Add KPI to create an organisational objective."
          )}
        </section>
      ) : null}

      {tab === "business-units" ? (
        <section aria-label="Business unit KPIs" className="space-y-4">
          <div className="max-w-sm">
            <label htmlFor="kpi-unit-filter" className="ims-text-label mb-1.5 block">
              Business unit
            </label>
            <select
              id="kpi-unit-filter"
              className="ims-select"
              value={selectedUnitId}
              onChange={(event) => setSelectedUnitId(event.target.value)}
            >
              <option value="">All business units</option>
              {(unitsQuery.data?.items ?? []).map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>
          {renderCards(
            businessUnitKpis,
            selectedUnitId
              ? "The business unit currently have no KPI/Objective setup for them."
              : "No business-unit KPI/Objectives yet.",
            "Use Add KPI with Business unit privacy to create one."
          )}
        </section>
      ) : null}

      {tab === "add" ? (
        <section aria-label="Add KPI">
          <KpiCreateForm
            pending={createMutation.isPending}
            onSubmit={handleCreate}
          />
        </section>
      ) : null}

      <ConfirmDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setPendingDelete(null);
        }}
        title="Delete KPI/Objective?"
        description={
          pendingDelete
            ? `Permanently remove ${pendingDelete.label}. This cannot be undone.`
            : ""
        }
        pending={deleteMutation.isPending}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
