import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Building2, Eye, Loader2, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { RowActionsMenu } from "@/shared/components/row-actions-menu";
import { SearchInput } from "@/shared/components/search-input";
import { PageHeader } from "@/shared/layout";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import {
  FunctionalUnitSheet,
  type FunctionalUnitSheetMode,
} from "../components/functional-unit-sheet";
import { useFunctionalUnitsQuery } from "../hooks/use-functional-units";
import type { AccessType } from "../types";

/**
 * Sheet interaction uses light URL state for deep links / refresh:
 * - `?create=1` → create sheet
 * - `?unit=<id>` → view (edit is in-sheet local mode)
 * Create/edit business flow stays on `/functional-units`.
 *
 * Delete is intentionally not exposed in the Functional Units UI.
 */
export function FunctionalUnitsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [accessType, setAccessType] = useState<AccessType | "">("");
  const [editMode, setEditMode] = useState(false);

  const createOpen = searchParams.get("create") === "1";
  const unitId = searchParams.get("unit");
  const sheetOpen = createOpen || Boolean(unitId);
  const sheetMode: FunctionalUnitSheetMode = createOpen
    ? "create"
    : editMode
      ? "edit"
      : "view";

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: search.trim() || undefined,
      accessType: accessType || undefined,
    }),
    [page, search, accessType]
  );

  const listQuery = useFunctionalUnitsQuery(queryParams);

  function openCreate() {
    setEditMode(false);
    setSearchParams({ create: "1" });
  }

  function openUnit(id: string) {
    setEditMode(false);
    setSearchParams({ unit: id });
  }

  function closeSheet() {
    setEditMode(false);
    setSearchParams({});
  }

  function handleModeChange(mode: FunctionalUnitSheetMode) {
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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Functional units"
        description="Organisation subdivisions used to scope people, access, and licensing."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus />
            Create a function
          </Button>
        }
      />

      <div className="ims-toolbar">
        <SearchInput
          placeholder="Search units"
          aria-label="Search units"
          containerClassName="min-w-[16rem] flex-1"
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
        />
        <select
          className="ims-select ims-field-sm w-auto min-w-[12rem]"
          value={accessType}
          aria-label="Filter by access type"
          onChange={(event) => {
            setPage(1);
            setAccessType(event.target.value as AccessType | "");
          }}
        >
          <option value="">All units</option>
          <option value="Internal business function">
            Internal business function
          </option>
          <option value="External function">External function</option>
          <option value="Internal compliance function">
            Internal compliance function
          </option>
          <option value="External compliance function">
            External compliance function
          </option>
        </select>
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading functional units…
        </div>
      ) : null}

      {listQuery.isError ? <ErrorState error={listQuery.error} /> : null}

      {listQuery.isSuccess && listQuery.data.total === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title="No functional units found"
          description="Create a unit to organise people, access, and licensing."
          action={
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus />
              Create a function
            </Button>
          }
        />
      ) : null}

      {listQuery.isSuccess && listQuery.data.items.length > 0 ? (
        <div className="ims-table-wrap">
          <table className="ims-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Responsibility</th>
                <th className="text-right">Members</th>
                <th className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {listQuery.data.items.map((unit) => (
                <EntityTableRow
                  key={unit.id}
                  disabled={unit.isSystemDefault}
                  onOpen={
                    unit.isSystemDefault ? undefined : () => openUnit(unit.id)
                  }
                >
                  <td className="font-medium">{unit.name}</td>
                  <td className="text-muted-foreground">{unit.accessType}</td>
                  <td className="max-w-[18rem] truncate text-muted-foreground">
                    {unit.responsibility}
                  </td>
                  <td className="text-right tabular-nums">
                    {unit.totalMembers}
                  </td>
                  <td className="text-right">
                    {unit.isSystemDefault ? (
                      <span className="ims-text-meta">Default</span>
                    ) : (
                      <RowActionsMenu
                        label={`Actions for ${unit.name}`}
                        actions={[
                          {
                            id: "details",
                            label: "Details",
                            icon: <Eye />,
                            onSelect: () => openUnit(unit.id),
                          },
                        ]}
                      />
                    )}
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

      <FunctionalUnitSheet
        open={sheetOpen}
        mode={sheetMode}
        unitId={unitId}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        onModeChange={handleModeChange}
        onCreated={(unit) => {
          notify.success("Business unit created successfully");
          setEditMode(false);
          setSearchParams({ unit: unit.id });
        }}
      />
    </div>
  );
}

function ErrorState({ error }: { error: unknown }) {
  if (isApiClientError(error)) {
    if (error.code === "FORBIDDEN" || error.status === 403) {
      return (
        <p className="ims-alert ims-alert-error" role="alert">
          You do not have permission to view functional units.
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
      Unable to load functional units.
    </p>
  );
}
