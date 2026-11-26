import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { SearchInput } from "@/shared/components/search-input";
import { Button } from "@/shared/components/ui/button";
import {
  useInventoryAssetsQuery,
  useInventoryCategoriesQuery,
} from "../hooks/use-inventory";
import {
  INVENTORY_STAGES,
  type InventoryStage,
} from "../types";
import { InventoryDueBadge, InventoryStageBadge } from "./inventory-badges";
import { PageLoader } from "@/shared/components/ims-loader";

type InventoryRegisterPanelProps = {
  onOpenAsset: (id: string) => void;
  onCreate: () => void;
  canCreate?: boolean;
};

export function InventoryRegisterPanel({
  onOpenAsset,
  onCreate,
  canCreate = true,
}: InventoryRegisterPanelProps) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [stage, setStage] = useState<InventoryStage | "">("");
  const [site, setSite] = useState("");
  const [issueOnly, setIssueOnly] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const params = useMemo(
    () => ({
      page,
      pageSize: 20,
      search: search || undefined,
      category: category || undefined,
      stage: stage || undefined,
      site: site || undefined,
      issue: issueOnly || undefined,
    }),
    [page, search, category, stage, site, issueOnly]
  );

  const listQuery = useInventoryAssetsQuery(params);
  const categoriesQuery = useInventoryCategoriesQuery();
  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const pageSize = listQuery.data?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const categories = categoriesQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="ims-toolbar flex-wrap">
        <SearchInput
          placeholder="Search tag, name, serial, location…"
          aria-label="Search assets"
          containerClassName="min-w-[14rem] flex-1"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          className="ims-select ims-field-sm w-auto min-w-[10rem]"
          value={category}
          aria-label="Filter by category"
          onChange={(e) => {
            setPage(1);
            setCategory(e.target.value);
          }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="ims-select ims-field-sm w-auto min-w-[8rem]"
          value={stage}
          aria-label="Filter by stage"
          onChange={(e) => {
            setPage(1);
            setStage(e.target.value as InventoryStage | "");
          }}
        >
          <option value="">All stages</option>
          {INVENTORY_STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          className="ims-field ims-field-sm w-auto min-w-[9rem]"
          placeholder="Site / location"
          aria-label="Filter by site"
          value={site}
          onChange={(e) => {
            setPage(1);
            setSite(e.target.value);
          }}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={issueOnly}
            onChange={(e) => {
              setPage(1);
              setIssueOnly(e.target.checked);
            }}
          />
          Issues only
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          {canCreate ? (
            <Button type="button" onClick={onCreate}>
              <Plus className="size-4" /> Add asset
            </Button>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {total} asset{total === 1 ? "" : "s"}
      </p>

      {listQuery.isLoading ? (
        <PageLoader label="Loading register…" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No assets yet"
          description="Add equipment to the register to track lifecycle and inspections."
          action={
            canCreate ? (
              <Button type="button" onClick={onCreate}>
                <Plus className="size-4" /> Add asset
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="ims-table w-full min-w-[720px]">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Asset</th>
                <th>Category</th>
                <th>Location</th>
                <th>Stage</th>
                <th>Next due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((asset) => (
                <EntityTableRow
                  key={asset.id}
                  onOpen={() => onOpenAsset(asset.id)}
                >
                  <td className="font-mono text-sm font-semibold">
                    {asset.tag}
                  </td>
                  <td>
                    <div className="font-medium">{asset.name}</div>
                    <div className="ims-text-meta">
                      {asset.custodian || "No custodian"}
                    </div>
                  </td>
                  <td>{asset.category}</td>
                  <td>{asset.location || "—"}</td>
                  <td>
                    <InventoryStageBadge stage={asset.stage} />
                  </td>
                  <td>{asset.nextDue ?? "—"}</td>
                  <td>
                    <InventoryDueBadge state={asset.nextDueState} />
                  </td>
                </EntityTableRow>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
