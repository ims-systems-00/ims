import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, Loader2, Package, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { RowActionsMenu } from "@/shared/components/row-actions-menu";
import { SearchInput } from "@/shared/components/search-input";
import { PageHeader } from "@/shared/layout";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import {
  CategoryMultiFilter,
  ModuleViewTabs,
  TagsManagementPanel,
  assetCategoryToTagModule,
} from "@/modules/tags-and-categories";
import {
  AssetSheet,
  type AssetSheetMode,
} from "../components/asset-sheet";
import {
  useAssetsQuery,
  useDeleteAssetMutation,
} from "../hooks/use-assets";
import {
  ASSET_CATEGORY_META,
  assetDisplayName,
  type AnyAsset,
  type AssetCategory,
  type HardwareAsset,
  type InformationAsset,
  type PeopleAsset,
  type PremiseAsset,
  type SoftwareAsset,
} from "../types";

type AssetsCategoryPageProps = {
  category: AssetCategory;
};

type PendingDelete = {
  id: string;
  label: string;
};

/**
 * URL sheet state (matches Functional Units pattern):
 * - `?create=1` → create sheet
 * - `?asset=<id>` → view (edit is in-sheet local mode)
 */
export function AssetsCategoryPage({ category }: AssetsCategoryPageProps) {
  const meta = ASSET_CATEGORY_META[category];
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [view, setView] = useState<"records" | "categories">("records");
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
  const assetId = searchParams.get("asset");
  const sheetOpen = createOpen || Boolean(assetId);
  const sheetMode: AssetSheetMode = createOpen
    ? "create"
    : editMode
      ? "edit"
      : "view";

  const tagModule = assetCategoryToTagModule(category);

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: search || undefined,
      categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
    }),
    [page, search, categoryIds]
  );

  const listQuery = useAssetsQuery(category, queryParams);
  const deleteMutation = useDeleteAssetMutation(category);

  function openCreate() {
    setEditMode(false);
    setSearchParams({ create: "1" });
  }

  function openAsset(id: string) {
    setEditMode(false);
    setSearchParams({ asset: id });
  }

  function closeSheet() {
    setEditMode(false);
    setSearchParams({});
  }

  function handleModeChange(mode: AssetSheetMode) {
    if (mode === "edit") {
      setEditMode(true);
      return;
    }
    if (mode === "view") {
      setEditMode(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    try {
      await deleteMutation.mutateAsync(id);
      setPendingDelete(null);
      notify.success(`${meta.singular} deleted successfully`);
      if (assetId === id) {
        closeSheet();
      }
    } catch (error) {
      setPendingDelete(null);
      notify.fromError(
        error,
        `Unable to delete ${meta.singular.toLowerCase()}`
      );
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={meta.label}
        description={`Inventory register for ${meta.label.toLowerCase()} assets.`}
        actions={
          view === "records" ? (
            <Button type="button" onClick={openCreate}>
              <Plus />
              {meta.createLabel}
            </Button>
          ) : null
        }
      />

      <ModuleViewTabs
        recordsLabel={meta.label}
        categoriesLabel="Categories"
        value={view}
        onChange={setView}
      />

      {view === "categories" ? (
        <TagsManagementPanel
          applicableModule={tagModule}
          title={`${meta.label} categories`}
          description={`Classify ${meta.label.toLowerCase()} assets for reporting and filtering. Categories created here are available when adding or editing a ${meta.singular.toLowerCase()}.`}
        />
      ) : (
        <>
      <div className="ims-toolbar">
        <SearchInput
          placeholder={`Search ${meta.label.toLowerCase()}`}
          aria-label={`Search ${meta.label}`}
          containerClassName="min-w-[16rem] flex-1"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <CategoryMultiFilter
          applicableModule={tagModule}
          value={categoryIds}
          onChange={(next) => {
            setPage(1);
            setCategoryIds(next);
          }}
        />
        {search || categoryIds.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("");
              setSearch("");
              setCategoryIds([]);
              setPage(1);
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading {meta.label.toLowerCase()}…
        </div>
      ) : null}

      {listQuery.isError ? (
        <ErrorState error={listQuery.error} label={meta.label} />
      ) : null}

      {listQuery.isSuccess && listQuery.data.total === 0 ? (
        <EmptyState
          icon={<Package />}
          title={
            search || categoryIds.length > 0
              ? `No ${meta.label.toLowerCase()} assets match your filters`
              : `No ${meta.label.toLowerCase()} assets yet`
          }
          description={
            search || categoryIds.length > 0
              ? "Try clearing filters or adjusting your search."
              : `Add a ${meta.singular.toLowerCase()} to start building this inventory.`
          }
        />
      ) : null}

      {listQuery.isSuccess && listQuery.data.items.length > 0 ? (
        <div className="ims-table-wrap">
          <table className="ims-table">
            <thead>
              <tr>
                {columnsFor(category).map((column) => (
                  <th key={column}>{column}</th>
                ))}
                <th className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {listQuery.data.items.map((raw) => {
                const asset = raw as AnyAsset;
                const label = assetDisplayName(asset);
                return (
                  <EntityTableRow
                    key={asset.id}
                    onOpen={() => openAsset(asset.id)}
                  >
                    {rowCells(category, asset).map((cell, index) => (
                      <td
                        key={`${asset.id}-${index}`}
                        className="text-muted-foreground first:font-medium first:text-foreground"
                      >
                        {cell}
                      </td>
                    ))}
                    <td className="text-right">
                      <RowActionsMenu
                        label={`Actions for ${label}`}
                        actions={[
                          {
                            id: "details",
                            label: "Details",
                            icon: <Eye />,
                            onSelect: () => openAsset(asset.id),
                          },
                          {
                            id: "delete",
                            label: "Delete",
                            icon: <Trash2 />,
                            variant: "destructive",
                            disabled: deleteMutation.isPending,
                            onSelect: () => {
                              setPendingDelete({ id: asset.id, label });
                            },
                          },
                        ]}
                      />
                    </td>
                  </EntityTableRow>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={`Delete ${meta.singular.toLowerCase()}?`}
        description={
          pendingDelete
            ? `“${pendingDelete.label}” will be removed from the inventory.`
            : ""
        }
        confirmLabel="Delete"
        pending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />

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
        </>
      )}

      <AssetSheet
        category={category}
        open={sheetOpen}
        mode={sheetMode}
        assetId={assetId}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        onModeChange={handleModeChange}
        onCreated={(created) => {
          notify.success(`${meta.singular} created successfully`);
          setEditMode(false);
          setSearchParams({ asset: created.id });
        }}
        onDeleted={() => {
          notify.success(`${meta.singular} deleted successfully`);
          closeSheet();
        }}
      />
    </div>
  );
}

function columnsFor(category: AssetCategory): string[] {
  switch (category) {
    case "hardware":
      return ["Reference", "Asset name", "Tag", "Owner", "Cost"];
    case "software":
      return ["Reference", "Software name", "Licences", "Installs", "Cost"];
    case "people":
      return ["Reference", "Name", "Role", "Skill", "Responsibility"];
    case "premise":
      return ["Reference", "Building name", "Address", "Location", "Cost"];
    case "information":
      return ["Reference", "Title", "Inventory", "Storage", "Owner"];
  }
}

function rowCells(category: AssetCategory, asset: AnyAsset): string[] {
  switch (category) {
    case "hardware": {
      const a = asset as HardwareAsset;
      return [a.reference, a.name, a.tag ?? "—", a.ownerId, String(a.cost)];
    }
    case "software": {
      const a = asset as SoftwareAsset;
      return [
        a.reference,
        a.name,
        String(a.licenceCount),
        String(a.installCount),
        String(a.cost),
      ];
    }
    case "people": {
      const a = asset as PeopleAsset;
      return [
        a.reference,
        a.name,
        a.role,
        a.skill,
        a.responsibility ?? "—",
      ];
    }
    case "premise": {
      const a = asset as PremiseAsset;
      return [a.reference, a.name, a.address, a.location, String(a.cost)];
    }
    case "information": {
      const a = asset as InformationAsset;
      return [
        a.reference,
        assetDisplayName(a),
        a.informationInventory ?? "—",
        a.storageLocation ?? "—",
        a.ownerId ?? "—",
      ];
    }
  }
}

function ErrorState({
  error,
  label,
}: {
  error: unknown;
  label: string;
}) {
  if (isApiClientError(error)) {
    if (error.code === "FORBIDDEN" || error.status === 403) {
      return (
        <p className="ims-alert ims-alert-error" role="alert">
          You do not have permission to view {label.toLowerCase()} assets.
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
      Unable to load {label.toLowerCase()} assets.
    </p>
  );
}
