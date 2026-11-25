import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { formatInterval } from "../lib/inventory-display";
import { useInventoryScheduleQuery } from "../hooks/use-inventory";
import { InventoryDueBadge, InventoryStageBadge } from "./inventory-badges";

type InventorySchedulePanelProps = {
  onOpenAsset: (id: string, tab?: string) => void;
};

export function InventorySchedulePanel({
  onOpenAsset,
}: InventorySchedulePanelProps) {
  const [due, setDue] = useState<"" | "over" | "soon">("");
  const [checkType, setCheckType] = useState("");

  const params = useMemo(
    () => ({
      due: due || undefined,
      checkType: checkType || undefined,
    }),
    [due, checkType]
  );

  const scheduleQuery = useInventoryScheduleQuery(params);
  const rows = scheduleQuery.data ?? [];

  const checkTypes = useMemo(() => {
    const set = new Set(rows.map((r) => r.checkName));
    return [...set].sort();
  }, [rows]);

  // When filtered empty, still offer known types from unfiltered if needed —
  // use current list for simplicity.
  const allTypesQuery = useInventoryScheduleQuery({});
  const typeOptions = useMemo(() => {
    const set = new Set(
      (allTypesQuery.data ?? []).map((r) => r.checkName)
    );
    return [...set].sort();
  }, [allTypesQuery.data]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Inspections, calibration &amp; maintenance
        </h2>
        <p className="text-sm text-muted-foreground">
          Each asset carries the checks its category requires. Record results
          from the asset sheet; Fail quarantines the asset.
        </p>
      </div>

      <div className="ims-toolbar flex-wrap">
        <select
          className="ims-select ims-field-sm w-auto min-w-[8rem]"
          value={due}
          aria-label="Due filter"
          onChange={(e) => setDue(e.target.value as "" | "over" | "soon")}
        >
          <option value="">All checks</option>
          <option value="over">Overdue</option>
          <option value="soon">Due in 30 days</option>
        </select>
        <select
          className="ims-select ims-field-sm w-auto min-w-[10rem]"
          value={checkType}
          aria-label="Check type"
          onChange={(e) => setCheckType(e.target.value)}
        >
          <option value="">All types</option>
          {(typeOptions.length ? typeOptions : checkTypes).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {scheduleQuery.isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading schedule…
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No checks on the schedule"
          description="Add assets with categories that define inspection intervals, or clear filters."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="ims-table w-full min-w-[800px]">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Check</th>
                <th>Interval</th>
                <th>Last</th>
                <th>Next due</th>
                <th>Stage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <EntityTableRow
                  key={`${row.assetId}-${row.checkName}`}
                  onOpen={() => onOpenAsset(row.assetId, "checks")}
                >
                  <td>
                    <div className="font-medium">
                      {row.tag} · {row.name}
                    </div>
                    <div className="ims-text-meta">{row.category}</div>
                  </td>
                  <td>
                    <div>{row.checkName}</div>
                    <div className="ims-text-meta">{row.basis}</div>
                  </td>
                  <td>{formatInterval(row.intervalMonths)}</td>
                  <td>{row.lastDate ?? "—"}</td>
                  <td className="font-medium">{row.nextDue ?? "—"}</td>
                  <td>
                    <InventoryStageBadge stage={row.stage} />
                  </td>
                  <td>
                    <InventoryDueBadge state={row.state} />
                  </td>
                </EntityTableRow>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
