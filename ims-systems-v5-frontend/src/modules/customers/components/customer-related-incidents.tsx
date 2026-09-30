import { useState } from "react";
import { Eye, Loader2, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  IncidentSheet,
  type IncidentSheetMode,
} from "@/modules/incidents";
import { useIncidentsQuery } from "@/modules/incidents/hooks/use-incidents";
import { CUSTOMERS_SOURCE_MODULE } from "../types";

type CustomerRelatedIncidentsProps = {
  customerId: string;
  businessUnitId?: string;
};

export function CustomerRelatedIncidents({
  customerId,
  businessUnitId,
}: CustomerRelatedIncidentsProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const incidentsQuery = useIncidentsQuery({
    page: 1,
    pageSize: 20,
    sourceModuleType: CUSTOMERS_SOURCE_MODULE,
    sourceModuleId: customerId,
    sort: "raisedOn",
    sortDir: "desc",
  });

  const sheetOpen = createOpen || Boolean(incidentId);
  const sheetMode: IncidentSheetMode = createOpen
    ? "create"
    : editMode
      ? "edit"
      : "view";

  function openCreate() {
    setEditMode(false);
    setIncidentId(null);
    setCreateOpen(true);
  }

  function openIncident(id: string) {
    setCreateOpen(false);
    setEditMode(false);
    setIncidentId(id);
  }

  function closeSheet() {
    setCreateOpen(false);
    setEditMode(false);
    setIncidentId(null);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="ims-text-section border-b border-border-subtle pb-2 flex-1">
          Linked incidents
        </h3>
        <Button type="button" size="sm" variant="outline" onClick={openCreate}>
          <Plus />
          Raise incident
        </Button>
      </div>

      {incidentsQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading incidents…
        </div>
      ) : null}

      {incidentsQuery.isError ? (
        <p className="ims-text-meta" role="alert">
          Unable to load linked incidents.
        </p>
      ) : null}

      {incidentsQuery.isSuccess && incidentsQuery.data.total === 0 ? (
        <p className="ims-text-meta">No incidents linked to this customer.</p>
      ) : null}

      {incidentsQuery.isSuccess && incidentsQuery.data.items.length > 0 ? (
        <ul className="space-y-2">
          {incidentsQuery.data.items.map((incident) => (
            <li
              key={incident.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{incident.title}</p>
                <p className="ims-text-meta">
                  {incident.reference} ·{" "}
                  {incident.resolved.status ? "Resolved" : "Open"}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Open incident ${incident.title}`}
                onClick={() => openIncident(incident.id)}
              >
                <Eye />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <IncidentSheet
        open={sheetOpen}
        mode={sheetMode}
        incidentId={incidentId}
        createSource={{
          moduleType: CUSTOMERS_SOURCE_MODULE,
          moduleId: customerId,
        }}
        createBusinessUnitId={businessUnitId}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        onModeChange={(mode) => {
          if (mode === "edit") setEditMode(true);
          if (mode === "view") setEditMode(false);
        }}
        onCreated={() => {
          void incidentsQuery.refetch();
        }}
      />
    </section>
  );
}
