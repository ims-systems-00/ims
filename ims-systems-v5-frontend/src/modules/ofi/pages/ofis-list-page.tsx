import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, Lightbulb, Loader2, Plus, Trash2 } from "lucide-react";
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
import { OfiStatusBadge } from "../components/ofi-badges";
import { OfiSheet, type OfiSheetMode } from "../components/ofi-sheet";
import { OfiStatsCards } from "../components/ofi-stats-cards";
import {
  useDeleteOfiMutation,
  useOfiStatsQuery,
  useOfisQuery,
} from "../hooks/use-ofi";
import { OFI_STATUS_OPTIONS, type OfiDisplayStatus } from "../types";

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
 * - `?ofi=<id>` → view (edit is in-sheet local mode)
 */
export function OfisListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OfiDisplayStatus | "">("");
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
  const ofiId = searchParams.get("ofi");
  const sheetOpen = createOpen || Boolean(ofiId);
  const sheetMode: OfiSheetMode = createOpen
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
      businessUnitIds: businessUnitId ? [businessUnitId] : undefined,
      ownerIds: ownerId ? [ownerId] : undefined,
      sort: "createdOn" as const,
      sortDir: "desc" as const,
    }),
    [page, search, status, businessUnitId, ownerId]
  );

  const listQuery = useOfisQuery(queryParams);
  const statsQuery = useOfiStatsQuery();
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });
  const deleteMutation = useDeleteOfiMutation();

  const hasFilters = Boolean(search || status || businessUnitId || ownerId);

  function openCreate() {
    setEditMode(false);
    setSearchParams({ create: "1" });
  }

  function openOfi(id: string) {
    setEditMode(false);
    setSearchParams({ ofi: id });
  }

  function closeSheet() {
    setEditMode(false);
    setSearchParams({});
  }

  function handleModeChange(mode: OfiSheetMode) {
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
      notify.success("OFI deleted successfully");
      if (ofiId === id) closeSheet();
    } catch (error) {
      setPendingDelete(null);
      notify.fromError(error, "Unable to delete OFI");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="OFI"
        description="Opportunities for improvement — raise, own, track activity, and mark implemented."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus />
            Raise OFI
          </Button>
        }
      />

      {statsQuery.isSuccess ? (
        <OfiStatsCards
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
          placeholder="Search reference, title, or opportunity"
          aria-label="Search OFIs"
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
            setStatus(event.target.value as OfiDisplayStatus | "");
          }}
        >
          <option value="">All statuses</option>
          {OFI_STATUS_OPTIONS.map((option) => (
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
          Loading OFIs…
        </div>
      ) : null}

      {listQuery.isError ? <ErrorState error={listQuery.error} /> : null}

      {listQuery.isSuccess && listQuery.data.total === 0 ? (
        <EmptyState
          icon={<Lightbulb />}
          title={
            hasFilters
              ? "No OFIs match your filters"
              : "No OFIs in the register yet"
          }
          description={
            hasFilters
              ? "Try clearing filters or adjusting your search."
              : "Raise an opportunity for improvement to start tracking continual improvement."
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
                Raise OFI
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
                <th>Status</th>
                <th>Raised</th>
                <th>Owner</th>
                <th className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {listQuery.data.items.map((ofi) => (
                <EntityTableRow
                  key={ofi.id}
                  onOpen={() => openOfi(ofi.id)}
                >
                  <td className="font-mono text-xs text-muted-foreground">
                    {ofi.reference}
                  </td>
                  <td className="max-w-[14rem] truncate font-medium">
                    {ofi.title}
                  </td>
                  <td className="max-w-[9rem]">
                    <UnitCell unitId={ofi.businessUnitId} />
                  </td>
                  <td>
                    <OfiStatusBadge status={ofi.displayStatus} />
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap">
                    {formatRaised(ofi.createdOn)}
                  </td>
                  <td className="max-w-[10rem]">
                    <OwnerCell ownerId={ofi.ownerId} />
                  </td>
                  <td className="text-right">
                    <RowActionsMenu
                      label={`Actions for ${ofi.title}`}
                      actions={[
                        {
                          id: "details",
                          label: "Details",
                          icon: <Eye />,
                          onSelect: () => openOfi(ofi.id),
                        },
                        ...(ofi.implemented.status !== "Implemented"
                          ? [
                              {
                                id: "delete",
                                label: "Delete",
                                icon: <Trash2 />,
                                variant: "destructive" as const,
                                onSelect: () =>
                                  setPendingDelete({
                                    id: ofi.id,
                                    label: ofi.title,
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

      <OfiSheet
        open={sheetOpen}
        mode={sheetMode}
        ofiId={ofiId}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        onModeChange={handleModeChange}
        onCreated={() => notify.success("OFI raised successfully")}
        onDeleted={() => notify.success("OFI deleted successfully")}
        onActionMessage={(message) => notify.success(message)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this OFI?"
        description={
          pendingDelete
            ? `“${pendingDelete.label}” will be removed from the register.`
            : "This OFI will be removed from the register."
        }
        confirmLabel="Delete OFI"
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
          You do not have permission to view OFIs.
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
      Unable to load OFIs.
    </p>
  );
}
