import { Loader2 } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { useInventoryAssetsQuery } from "../hooks/use-inventory";
import { InventoryStageBadge } from "./inventory-badges";

type InventoryDisposalsPanelProps = {
  onOpenAsset: (id: string, tab?: string) => void;
};

export function InventoryDisposalsPanel({
  onOpenAsset,
}: InventoryDisposalsPanelProps) {
  const retiredQuery = useInventoryAssetsQuery({
    page: 1,
    pageSize: 100,
    stage: "Retired",
    includeDisposed: true,
  });
  const disposedQuery = useInventoryAssetsQuery({
    page: 1,
    pageSize: 100,
    stage: "Disposed",
    includeDisposed: true,
  });

  const items = [
    ...(retiredQuery.data?.items ?? []),
    ...(disposedQuery.data?.items ?? []),
  ].sort((a, b) => (b.disposal?.date ?? "").localeCompare(a.disposal?.date ?? ""));

  const loading = retiredQuery.isLoading || disposedQuery.isLoading;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Disposals &amp; retirements
        </h2>
        <p className="text-sm text-muted-foreground">
          Disposed assets stay on the register as records and are excluded from
          active counts and schedules.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading disposals…
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No retirements or disposals"
          description="Lifecycle moves to Retired or Disposed will appear here."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="ims-table w-full min-w-[800px]">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Asset</th>
                <th>Stage</th>
                <th>Reason</th>
                <th>Route</th>
                <th>Evidence</th>
                <th>Approved by</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((asset) => (
                <EntityTableRow
                  key={asset.id}
                  onOpen={() => onOpenAsset(asset.id, "lifecycle")}
                >
                  <td className="font-mono font-semibold">{asset.tag}</td>
                  <td>{asset.name}</td>
                  <td>
                    <InventoryStageBadge stage={asset.stage} />
                  </td>
                  <td>{asset.disposal?.reason || "—"}</td>
                  <td>{asset.disposal?.route || "—"}</td>
                  <td>{asset.disposal?.evidence || "—"}</td>
                  <td>{asset.disposal?.approvedBy || "—"}</td>
                  <td>{asset.disposal?.date || "—"}</td>
                </EntityTableRow>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
