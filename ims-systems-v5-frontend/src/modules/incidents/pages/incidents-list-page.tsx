import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Download,
  Eye,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { RowActionsMenu } from "@/shared/components/row-actions-menu";
import { SearchInput } from "@/shared/components/search-input";
import { PageHeader } from "@/shared/layout";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import { useFunctionalUnitsQuery } from "@/modules/functional-units/hooks/use-functional-units";
import { useUserQuery, useUsersQuery } from "@/modules/users/hooks/use-users";
import {
  IncidentSheet,
  type IncidentSheetMode,
} from "../components/incident-sheet";
import {
  IncidentPriorityBadge,
  IncidentStatusBadge,
} from "../components/incident-badges";
import { IncidentStatsCards } from "../components/incident-stats-cards";
import {
  useDeleteIncidentMutation,
  useDownloadIncidentsReportMutation,
  useIncidentStatsQuery,
  useIncidentsQuery,
} from "../hooks/use-incidents";
import {
  INCIDENT_PRIORITIES,
  INCIDENT_STATUS_OPTIONS,
  type IncidentDisplayStatus,
  type IncidentPriority,
} from "../types";

type PendingDelete = { id: string; label: string };

function OwnerCell({ ownerId }: { ownerId?: string }) {
  const query = useUserQuery(ownerId, Boolean(ownerId));
  if (!ownerId) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="truncate">
      {query.data?.user.name ?? ownerId.slice(0, 8)}
    </span>
  );
}

function UnitCell({ unitId }: { unitId?: string }) {
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  if (!unitId) return <span className="text-muted-foreground">—</span>;
  const name = unitsQuery.data?.items.find((u) => u.id === unitId)?.name;
  return <span className="truncate">{name ?? unitId.slice(0, 8)}</span>;
}

function formatRaised(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * URL sheet state:
 * - `?create=1` → raise sheet
 * - `?incident=<id>` → view (edit is in-sheet local mode)
 */
export function IncidentsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<IncidentDisplayStatus | "">("");
  const [priority, setPriority] = useState<IncidentPriority | "">("");
  const [businessUnitId, setBusinessUnitId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const createOpen = searchParams.get("create") === "1";
  const incidentId = searchParams.get("incident");
  const sheetOpen = createOpen || Boolean(incidentId);
  const sheetMode: IncidentSheetMode = createOpen
    ? "create"
    : editMode
      ? "edit"
      : "view";

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: search || undefined,
      status: status || undefined,
      priorities: priority ? [priority] : undefined,
      businessUnitIds: businessUnitId ? [businessUnitId] : undefined,
      ownerIds: ownerId ? [ownerId] : undefined,
      sort: "raisedOn" as const,
      sortDir: "desc" as const,
    }),
    [page, search, status, priority, businessUnitId, ownerId]
  );

  const listQuery = useIncidentsQuery(queryParams);
  const statsQuery = useIncidentStatsQuery();
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });
  const deleteMutation = useDeleteIncidentMutation();
  const reportMutation = useDownloadIncidentsReportMutation();

  const hasFilters = Boolean(
    search || status || priority || businessUnitId || ownerId
  );

  function openCreate() {
    setEditMode(false);
    setSearchParams({ create: "1" });
  }

  function openIncident(id: string) {
    setEditMode(false);
    setSearchParams({ incident: id });
  }

  function closeSheet() {
    setEditMode(false);
    setSearchParams({});
  }

  function handleModeChange(mode: IncidentSheetMode) {
    if (mode === "edit") {
      setEditMode(true);
      return;
    }
    if (mode === "view") setEditMode(false);
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setPriority("");
    setBusinessUnitId("");
    setOwnerId("");
    setPage(1);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    try {
      await deleteMutation.mutateAsync(id);
      setPendingDelete(null);
      notify.success("Incident deleted successfully");
      if (incidentId === id) closeSheet();
    } catch (error) {
      setPendingDelete(null);
      notify.fromError(error, "Unable to delete incident");
    }
  }

  async function handleExport() {
    try {
      const blob = await reportMutation.mutateAsync();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "incidents-report.csv";
      anchor.click();
      URL.revokeObjectURL(url);
      notify.success("Incidents report downloaded");
    } catch (error) {
      notify.fromError(error, "Unable to download incidents report");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Incidents"
        description="Organisation incident register — raise, own, escalate, and resolve incidents."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={reportMutation.isPending}
              onClick={() => void handleExport()}
            >
              <Download />
              Export
            </Button>
            <Button type="button" onClick={openCreate}>
              <Plus />
              Raise incident
            </Button>
          </div>
        }
      />

      {statsQuery.isSuccess ? (
        <IncidentStatsCards
          stats={statsQuery.data}
          activeStatus={status}
          onSelectStatus={(next) => {
            setPage(1);
            setStatus(next);
          }}
        />
      ) : null}

      <div className="ims-toolbar">
        <SearchInput
          placeholder="Search reference, title, or description"
          aria-label="Search incidents"
          containerClassName="min-w-[16rem] flex-1"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <select
          className="ims-select ims-field-sm w-auto min-w-[9rem]"
          value={status}
          aria-label="Filter by status"
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as IncidentDisplayStatus | "");
          }}
        >
          <option value="">All statuses</option>
          {INCIDENT_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="ims-select ims-field-sm w-auto min-w-[7rem]"
          value={priority}
          aria-label="Filter by priority"
          onChange={(event) => {
            setPage(1);
            setPriority(event.target.value as IncidentPriority | "");
          }}
        >
          <option value="">All priorities</option>
          {INCIDENT_PRIORITIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="ims-select ims-field-sm w-auto min-w-[10rem]"
          value={businessUnitId}
          aria-label="Filter by business unit"
          onChange={(event) => {
            setPage(1);
            setBusinessUnitId(event.target.value);
          }}
        >
          <option value="">All units</option>
          {(unitsQuery.data?.items ?? []).map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
        <select
          className="ims-select ims-field-sm w-auto min-w-[10rem]"
          value={ownerId}
          aria-label="Filter by owner"
          onChange={(event) => {
            setPage(1);
            setOwnerId(event.target.value);
          }}
        >
          <option value="">All owners</option>
          {(usersQuery.data?.items ?? []).map((row) => (
            <option key={row.user.id} value={row.user.id}>
              {row.user.name}
            </option>
          ))}
        </select>
        {hasFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        ) : null}
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading incidents…
        </div>
      ) : null}

      {listQuery.isError ? <ErrorState error={listQuery.error} /> : null}

      {listQuery.isSuccess && listQuery.data.total === 0 ? (
        <EmptyState
          icon={<AlertTriangle />}
          title={
            hasFilters
              ? "No incidents match your filters"
              : "No incidents in the register yet"
          }
          description={
            hasFilters
              ? "Try clearing filters or adjusting your search."
              : "Raise an incident to start tracking organisational issues."
          }
          action={
            hasFilters ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={openCreate}>
                <Plus />
                Raise incident
              </Button>
            )
          }
        />
      ) : null}

      {listQuery.isSuccess && listQuery.data.items.length > 0 ? (
        <div className="ims-table-wrap">
          <table className="ims-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Title</th>
                <th>Unit</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Raised</th>
                <th>Owner</th>
                <th className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {listQuery.data.items.map((incident) => (
                <EntityTableRow
                  key={incident.id}
                  onOpen={() => openIncident(incident.id)}
                >
                  <td className="font-mono text-xs text-muted-foreground">
                    {incident.reference}
                  </td>
                  <td className="max-w-[14rem] truncate font-medium">
                    {incident.title}
                  </td>
                  <td className="max-w-[9rem]">
                    <UnitCell unitId={incident.businessUnitId} />
                  </td>
                  <td>
                    <IncidentPriorityBadge priority={incident.priority} />
                  </td>
                  <td>
                    <IncidentStatusBadge status={incident.displayStatus} />
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap">
                    {formatRaised(incident.raisedOn)}
                  </td>
                  <td className="max-w-[10rem]">
                    <OwnerCell ownerId={incident.ownerId} />
                  </td>
                  <td className="text-right">
                    <RowActionsMenu
                      label={`Actions for ${incident.title}`}
                      actions={[
                        {
                          id: "details",
                          label: "Details",
                          icon: <Eye />,
                          onSelect: () => openIncident(incident.id),
                        },
                        ...(!incident.resolved.status
                          ? [
                              {
                                id: "delete",
                                label: "Delete",
                                icon: <Trash2 />,
                                variant: "destructive" as const,
                                onSelect: () =>
                                  setPendingDelete({
                                    id: incident.id,
                                    label: incident.title,
                                  }),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </td>
                </EntityTableRow>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {listQuery.isSuccess && listQuery.data.totalPages > 1 ? (
        <div className="ims-pagination">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <span className="ims-text-meta tabular-nums">
            Page {listQuery.data.page} of {listQuery.data.totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= listQuery.data.totalPages}
            onClick={() =>
              setPage((current) =>
                Math.min(listQuery.data.totalPages, current + 1)
              )
            }
          >
            Next
          </Button>
        </div>
      ) : null}

      <IncidentSheet
        open={sheetOpen}
        mode={sheetMode}
        incidentId={incidentId}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        onModeChange={handleModeChange}
        onCreated={() => notify.success("Incident raised successfully")}
        onDeleted={() => notify.success("Incident deleted successfully")}
        onActionMessage={(message) => notify.success(message)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this incident?"
        description={
          pendingDelete
            ? `“${pendingDelete.label}” will be removed from the register.`
            : "This incident will be removed from the register."
        }
        confirmLabel="Delete incident"
        pending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function ErrorState({ error }: { error: unknown }) {
  if (isApiClientError(error)) {
    if (error.status === 403 || error.code === "FORBIDDEN") {
      return (
        <p className="ims-alert ims-alert-error" role="alert">
          You do not have permission to view incidents.
        </p>
      );
    }
    return (
      <p className="ims-alert ims-alert-error" role="alert">
        {error.message}
      </p>
    );
  }
  return (
    <p className="ims-alert ims-alert-error" role="alert">
      Unable to load incidents.
    </p>
  );
}
