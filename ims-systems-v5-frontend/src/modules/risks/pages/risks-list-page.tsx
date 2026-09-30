import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Download,
  Eye,
  Loader2,
  Plus,
  ShieldAlert,
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
import { useUserQuery } from "@/modules/users/hooks/use-users";
import { RiskSheet, type RiskSheetMode } from "../components/risk-sheet";
import { RiskScoreBadge, RiskStatusBadge } from "../components/risk-badges";
import { RiskStatsCards } from "../components/risk-stats-cards";
import {
  useDeleteRiskMutation,
  useDownloadRisksReportMutation,
  useRiskStatsQuery,
  useRisksQuery,
} from "../hooks/use-risks";
import {
  RISK_STATUS_OPTIONS,
  RISK_TYPES,
  type RiskDisplayStatus,
  type RiskType,
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
 * - `?risk=<id>` → view (edit is in-sheet local mode)
 */
export function RisksListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<RiskDisplayStatus | "">("");
  const [type, setType] = useState<RiskType | "">("");
  const [businessUnitId, setBusinessUnitId] = useState("");
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
  const riskId = searchParams.get("risk");
  const sheetOpen = createOpen || Boolean(riskId);
  const sheetMode: RiskSheetMode = createOpen
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
      types: type ? [type] : undefined,
      businessUnitIds: businessUnitId ? [businessUnitId] : undefined,
      sort: "raisedOn" as const,
      sortDir: "desc" as const,
    }),
    [page, search, status, type, businessUnitId]
  );

  const listQuery = useRisksQuery(queryParams);
  const statsQuery = useRiskStatsQuery();
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  const deleteMutation = useDeleteRiskMutation();
  const reportMutation = useDownloadRisksReportMutation();

  const hasFilters = Boolean(search || status || type || businessUnitId);

  function openCreate() {
    setEditMode(false);
    setSearchParams({ create: "1" });
  }

  function openRisk(id: string) {
    setEditMode(false);
    setSearchParams({ risk: id });
  }

  function closeSheet() {
    setEditMode(false);
    setSearchParams({});
  }

  function handleModeChange(mode: RiskSheetMode) {
    if (mode === "edit") {
      setEditMode(true);
      return;
    }
    if (mode === "view") {
      setEditMode(false);
    }
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setType("");
    setBusinessUnitId("");
    setPage(1);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    try {
      await deleteMutation.mutateAsync(id);
      setPendingDelete(null);
      notify.success("Risk deleted successfully");
      if (riskId === id) closeSheet();
    } catch (error) {
      setPendingDelete(null);
      notify.fromError(error, "Unable to delete risk");
    }
  }

  async function handleExport() {
    try {
      const blob = await reportMutation.mutateAsync();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "risks-report.csv";
      anchor.click();
      URL.revokeObjectURL(url);
      notify.success("Risks report downloaded");
    } catch (error) {
      notify.fromError(error, "Unable to download risks report");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Risks"
        description="Organisation risk register — raise, score, own, and treat risks."
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
              Raise risk
            </Button>
          </div>
        }
      />

      {statsQuery.isSuccess ? (
        <RiskStatsCards
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
          aria-label="Search risks"
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
            setStatus(event.target.value as RiskDisplayStatus | "");
          }}
        >
          <option value="">All statuses</option>
          {RISK_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="ims-select ims-field-sm w-auto min-w-[9rem]"
          value={type}
          aria-label="Filter by type"
          onChange={(event) => {
            setPage(1);
            setType(event.target.value as RiskType | "");
          }}
        >
          <option value="">All types</option>
          {RISK_TYPES.map((option) => (
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
        {hasFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        ) : null}
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading risks…
        </div>
      ) : null}

      {listQuery.isError ? <ErrorState error={listQuery.error} /> : null}

      {listQuery.isSuccess && listQuery.data.total === 0 ? (
        <EmptyState
          icon={<ShieldAlert />}
          title={
            hasFilters
              ? "No risks match your filters"
              : "No risks in the register yet"
          }
          description={
            hasFilters
              ? "Try clearing filters or adjusting your search."
              : "Raise a risk to start tracking organisational exposure."
          }
          action={
            hasFilters ? (
              <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={openCreate}>
                <Plus />
                Raise risk
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
                <th>Type</th>
                <th>Score</th>
                <th>Status</th>
                <th>Raised</th>
                <th>Owner</th>
                <th className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {listQuery.data.items.map((risk) => (
                <EntityTableRow
                  key={risk.id}
                  onOpen={() => openRisk(risk.id)}
                >
                  <td className="font-mono text-xs text-muted-foreground">
                    {risk.reference}
                  </td>
                  <td className="max-w-[14rem] truncate font-medium">
                    {risk.title}
                  </td>
                  <td className="text-muted-foreground">{risk.type}</td>
                  <td>
                    <RiskScoreBadge
                      total={risk.currentScore.total}
                      band={risk.scoreBand}
                    />
                  </td>
                  <td>
                    <RiskStatusBadge status={risk.displayStatus} />
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap">
                    {formatRaised(risk.raisedOn)}
                  </td>
                  <td className="max-w-[10rem]">
                    <OwnerCell ownerId={risk.ownerId} />
                  </td>
                  <td className="text-right">
                    <RowActionsMenu
                      label={`Actions for ${risk.title}`}
                      actions={[
                        {
                          id: "details",
                          label: "Details",
                          icon: <Eye />,
                          onSelect: () => openRisk(risk.id),
                        },
                        {
                          id: "delete",
                          label: "Delete",
                          icon: <Trash2 />,
                          variant: "destructive",
                          onSelect: () =>
                            setPendingDelete({
                              id: risk.id,
                              label: risk.title,
                            }),
                        },
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

      <RiskSheet
        open={sheetOpen}
        mode={sheetMode}
        riskId={riskId}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        onModeChange={handleModeChange}
        onCreated={() => notify.success("Risk raised successfully")}
        onDeleted={() => notify.success("Risk deleted successfully")}
        onActionMessage={(message) => notify.success(message)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this risk?"
        description={
          pendingDelete
            ? `“${pendingDelete.label}” will be removed from the register.`
            : "This risk will be removed from the register."
        }
        confirmLabel="Delete risk"
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
          You do not have permission to view risks.
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
      Unable to load risks.
    </p>
  );
}
