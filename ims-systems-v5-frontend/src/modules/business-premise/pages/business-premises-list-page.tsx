import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, Landmark, Loader2, Plus, Trash2 } from "lucide-react";
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
import {
  BusinessPremiseSheet,
  type BusinessPremiseSheetMode,
} from "../components/business-premise-sheet";
import {
  useBusinessPremisesQuery,
  useDeleteBusinessPremiseMutation,
} from "../hooks/use-business-premises";

type PendingDelete = { id: string; label: string };

function UnitsCell({ unitIds }: { unitIds: string[] }) {
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  if (unitIds.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  const names = unitIds.map((id) => {
    const name = unitsQuery.data?.items.find((u) => u.id === id)?.name;
    return name ?? id.slice(0, 8);
  });
  const visible = names.slice(0, 2).join(", ");
  const extra = names.length > 2 ? ` +${names.length - 2}` : "";
  return (
    <span className="truncate" title={names.join(", ")}>
      {visible}
      {extra}
    </span>
  );
}

/**
 * URL sheet state:
 * - `?create=1` → create sheet
 * - `?premise=<id>` → view (edit is in-sheet local mode)
 */
export function BusinessPremisesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
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
  const premiseId = searchParams.get("premise");
  const sheetOpen = createOpen || Boolean(premiseId);
  const sheetMode: BusinessPremiseSheetMode = createOpen
    ? "create"
    : editMode
      ? "edit"
      : "view";

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: search || undefined,
      sort: "createdOn" as const,
      sortDir: "desc" as const,
    }),
    [page, search]
  );

  const listQuery = useBusinessPremisesQuery(queryParams);
  const deleteMutation = useDeleteBusinessPremiseMutation();
  const hasSearch = Boolean(search);

  function openCreate() {
    setEditMode(false);
    setSearchParams({ create: "1" });
  }

  function openPremise(id: string) {
    setEditMode(false);
    setSearchParams({ premise: id });
  }

  function closeSheet() {
    setEditMode(false);
    setSearchParams({});
  }

  function handleModeChange(mode: BusinessPremiseSheetMode) {
    if (mode === "edit") {
      setEditMode(true);
      return;
    }
    if (mode === "view") {
      setEditMode(false);
      return;
    }
    if (mode === "create") {
      openCreate();
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    try {
      await deleteMutation.mutateAsync(id);
      setPendingDelete(null);
      notify.success("Business Premise deleted successfully");
      if (premiseId === id) closeSheet();
    } catch (error) {
      setPendingDelete(null);
      notify.fromError(error, "Unable to delete Business Premise");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Business Premises"
        description="Organisation register of physical sites linked to Internal business function units."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus />
            Create premise
          </Button>
        }
      />

      <div className="ims-toolbar">
        <SearchInput
          placeholder="Search name, location, address, or reference"
          aria-label="Search Business Premises"
          containerClassName="min-w-[16rem] flex-1"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading Business Premises…
        </div>
      ) : null}

      {listQuery.isError ? <ErrorState error={listQuery.error} /> : null}

      {listQuery.isSuccess && listQuery.data.total === 0 ? (
        <EmptyState
          icon={<Landmark />}
          title={
            hasSearch
              ? "No premises match your search"
              : "No Business Premises yet"
          }
          description={
            hasSearch
              ? "Try a different search term, or clear the search to see all premises."
              : "Register a physical site and link the Functional Units that operate there."
          }
          action={
            hasSearch ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setPage(1);
                }}
              >
                Clear search
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={openCreate}>
                <Plus />
                Create premise
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
                <th>Premise name</th>
                <th>Location</th>
                <th>Address</th>
                <th>Functional units</th>
                <th className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {listQuery.data.items.map((premise) => (
                <EntityTableRow
                  key={premise.id}
                  onOpen={() => openPremise(premise.id)}
                >
                  <td className="font-medium">{premise.name}</td>
                  <td className="text-muted-foreground">{premise.location}</td>
                  <td className="max-w-[16rem] truncate text-muted-foreground">
                    {premise.address}
                  </td>
                  <td className="max-w-[14rem] text-muted-foreground">
                    <UnitsCell unitIds={premise.functionalUnitIds} />
                  </td>
                  <td className="text-right">
                    <RowActionsMenu
                      label={`Actions for ${premise.name}`}
                      actions={[
                        {
                          id: "details",
                          label: "Details",
                          icon: <Eye />,
                          onSelect: () => openPremise(premise.id),
                        },
                        {
                          id: "delete",
                          label: "Delete",
                          icon: <Trash2 />,
                          variant: "destructive",
                          onSelect: () =>
                            setPendingDelete({
                              id: premise.id,
                              label: premise.name,
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
          <span>
            Page {listQuery.data.page} of {listQuery.data.totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= listQuery.data.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      <BusinessPremiseSheet
        open={sheetOpen}
        mode={sheetMode}
        premiseId={premiseId}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        onModeChange={handleModeChange}
        onCreated={(premise) => {
          notify.success("Business Premise created successfully");
          setEditMode(false);
          setSearchParams({ premise: premise.id });
        }}
        onDeleted={() => notify.success("Business Premise deleted successfully")}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this Business Premise?"
        description={
          pendingDelete
            ? `“${pendingDelete.label}” will be permanently removed from the organisation register.`
            : "This premise will be permanently deleted."
        }
        confirmLabel="Delete premise"
        pending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function ErrorState({ error }: { error: unknown }) {
  if (isApiClientError(error)) {
    if (error.code === "FORBIDDEN" || error.status === 403) {
      return (
        <p className="ims-alert ims-alert-error" role="alert">
          You do not have permission to view Business Premises.
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
      Unable to load Business Premises.
    </p>
  );
}
