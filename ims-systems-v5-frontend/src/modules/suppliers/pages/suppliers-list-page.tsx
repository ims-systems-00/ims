import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, Loader2, Plus, Trash2, Truck } from "lucide-react";
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
import { SupplierComplianceBadge } from "../components/supplier-badges";
import {
  SupplierSheet,
  type SupplierSheetMode,
} from "../components/supplier-sheet";
import { SupplierStatsCards } from "../components/supplier-stats-cards";
import {
  useDeleteSupplierMutation,
  useSupplierStatsQuery,
  useSuppliersQuery,
} from "../hooks/use-suppliers";

type PendingDelete = { id: string; label: string };

function BuyerCell({ buyerId }: { buyerId?: string }) {
  const query = useUserQuery(buyerId, Boolean(buyerId));
  if (!buyerId) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="truncate">
      {query.data?.user.name ?? buyerId.slice(0, 8)}
    </span>
  );
}

function UnitCell({ unitId }: { unitId?: string }) {
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  if (!unitId) return <span className="text-muted-foreground">—</span>;
  const name = unitsQuery.data?.items.find((u) => u.id === unitId)?.name;
  return <span className="truncate">{name ?? unitId.slice(0, 8)}</span>;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * URL sheet state:
 * - `?create=1` → register sheet
 * - `?supplier=<id>` → view (edit is in-sheet local mode)
 */
export function SuppliersListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [businessUnitId, setBusinessUnitId] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [createdById, setCreatedById] = useState("");
  const [isCompliant, setIsCompliant] = useState<boolean | null>(null);
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
  const supplierId = searchParams.get("supplier");
  const sheetOpen = createOpen || Boolean(supplierId);
  const sheetMode: SupplierSheetMode = createOpen
    ? "create"
    : editMode
      ? "edit"
      : "view";

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: search || undefined,
      businessUnitIds: businessUnitId ? [businessUnitId] : undefined,
      buyerIds: buyerId ? [buyerId] : undefined,
      createdByIds: createdById ? [createdById] : undefined,
      isCompliant: isCompliant ?? undefined,
      sort: "createdOn" as const,
      sortDir: "desc" as const,
    }),
    [page, search, businessUnitId, buyerId, createdById, isCompliant]
  );

  const listQuery = useSuppliersQuery(queryParams);
  const statsQuery = useSupplierStatsQuery();
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });
  const deleteMutation = useDeleteSupplierMutation();

  const hasFilters = Boolean(
    search || businessUnitId || buyerId || createdById || isCompliant !== null
  );

  function openCreate() {
    setEditMode(false);
    setSearchParams({ create: "1" });
  }

  function openSupplier(id: string) {
    setEditMode(false);
    setSearchParams({ supplier: id });
  }

  function closeSheet() {
    setEditMode(false);
    setSearchParams({});
  }

  function handleModeChange(mode: SupplierSheetMode) {
    if (mode === "edit") {
      setEditMode(true);
      return;
    }
    if (mode === "view") setEditMode(false);
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setBusinessUnitId("");
    setBuyerId("");
    setCreatedById("");
    setIsCompliant(null);
    setPage(1);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    try {
      await deleteMutation.mutateAsync(id);
      setPendingDelete(null);
      notify.success("Supplier deleted successfully");
      if (supplierId === id) closeSheet();
    } catch (error) {
      setPendingDelete(null);
      notify.fromError(error, "Unable to delete supplier");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Suppliers"
        description="Third-party supplier register — contracts, compliance evidence, KPIs, and linked incidents."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus />
            Register supplier
          </Button>
        }
      />

      {statsQuery.isSuccess ? (
        <SupplierStatsCards
          stats={statsQuery.data}
          activeCompliant={isCompliant}
          onSelectCompliant={(next) => {
            setPage(1);
            setIsCompliant(next);
          }}
        />
      ) : null}

      <div className="ims-toolbar">
        <SearchInput
          placeholder="Search reference, name, email, or service"
          aria-label="Search suppliers"
          containerClassName="min-w-[16rem] flex-1"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <select
          className="ims-select ims-field-sm w-auto min-w-[9rem]"
          value={
            isCompliant === null ? "" : isCompliant ? "true" : "false"
          }
          aria-label="Filter by compliance"
          onChange={(event) => {
            setPage(1);
            const value = event.target.value;
            setIsCompliant(
              value === "" ? null : value === "true"
            );
          }}
        >
          <option value="">All compliance</option>
          <option value="true">Compliant</option>
          <option value="false">Not compliant</option>
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
          value={buyerId}
          aria-label="Filter by buyer"
          onChange={(event) => {
            setPage(1);
            setBuyerId(event.target.value);
          }}
        >
          <option value="">All buyers</option>
          {(usersQuery.data?.items ?? []).map((row) => (
            <option key={row.user.id} value={row.user.id}>
              {row.user.name}
            </option>
          ))}
        </select>
        <select
          className="ims-select ims-field-sm w-auto min-w-[10rem]"
          value={createdById}
          aria-label="Filter by logged by"
          onChange={(event) => {
            setPage(1);
            setCreatedById(event.target.value);
          }}
        >
          <option value="">All creators</option>
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
          Loading suppliers…
        </div>
      ) : null}

      {listQuery.isError ? <ErrorState error={listQuery.error} /> : null}

      {listQuery.isSuccess && listQuery.data.total === 0 ? (
        <EmptyState
          icon={<Truck />}
          title={
            hasFilters
              ? "No suppliers match your filters"
              : "No suppliers in the register yet"
          }
          description={
            hasFilters
              ? "Try clearing filters or adjusting your search."
              : "Register a supplier to start tracking contracts and compliance evidence."
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
                Register supplier
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
                <th>Supplier</th>
                <th>Unit</th>
                <th>Account manager</th>
                <th>Compliant</th>
                <th>Value</th>
                <th>Buyer</th>
                <th className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {listQuery.data.items.map((supplier) => (
                <EntityTableRow
                  key={supplier.id}
                  onOpen={() => openSupplier(supplier.id)}
                >
                  <td className="font-mono text-xs text-muted-foreground">
                    {supplier.reference}
                  </td>
                  <td className="max-w-[14rem] truncate font-medium">
                    {supplier.name}
                  </td>
                  <td className="max-w-[9rem]">
                    <UnitCell unitId={supplier.businessUnitId} />
                  </td>
                  <td className="max-w-[10rem] truncate text-muted-foreground">
                    {supplier.accountManager}
                  </td>
                  <td>
                    <SupplierComplianceBadge
                      isCompliant={supplier.isCompliant}
                    />
                  </td>
                  <td className="whitespace-nowrap tabular-nums text-muted-foreground">
                    {formatCurrency(supplier.contractValue)}
                  </td>
                  <td className="max-w-[10rem]">
                    <BuyerCell buyerId={supplier.buyerId} />
                  </td>
                  <td className="text-right">
                    <RowActionsMenu
                      label={`Actions for ${supplier.name}`}
                      actions={[
                        {
                          id: "details",
                          label: "Details",
                          icon: <Eye />,
                          onSelect: () => openSupplier(supplier.id),
                        },
                        {
                          id: "delete",
                          label: "Delete",
                          icon: <Trash2 />,
                          variant: "destructive" as const,
                          onSelect: () =>
                            setPendingDelete({
                              id: supplier.id,
                              label: supplier.name,
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

      <SupplierSheet
        open={sheetOpen}
        mode={sheetMode}
        supplierId={supplierId}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        onModeChange={handleModeChange}
        onCreated={() => notify.success("Supplier registered successfully")}
        onDeleted={() => notify.success("Supplier deleted successfully")}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this supplier?"
        description={
          pendingDelete
            ? `“${pendingDelete.label}” will be removed from the register.`
            : "This supplier will be removed from the register."
        }
        confirmLabel="Delete supplier"
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
          You do not have permission to view suppliers.
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
      Unable to load suppliers.
    </p>
  );
}
