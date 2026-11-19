import { useMemo } from "react";
import { ExternalLink, Loader2, Mail } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { docState, formatReqLabel, requiredDocsFor } from "../lib/asl-display";
import {
  useAslSettingsQuery,
  useAslSuppliersQuery,
} from "../hooks/use-asl-supplier";
import { AslCritBadge, AslDocStateBadge } from "./asl-badges";

type AslDocsPanelProps = {
  onOpenSupplier: (id: string, tab?: string) => void;
  onNotify: (ids: string[]) => void;
};

export function AslDocsPanel({ onOpenSupplier, onNotify }: AslDocsPanelProps) {
  const listQuery = useAslSuppliersQuery({ page: 1, pageSize: 100 });
  const settingsQuery = useAslSettingsQuery();
  const lead = settingsQuery.data?.lead ?? 30;

  const rows = useMemo(() => {
    const items = listQuery.data?.items ?? [];
    const out: Array<{
      supplierId: string;
      name: string;
      crit: string;
      label: string;
      state: "missing" | "expired" | "soon";
      docId?: string;
    }> = [];
    for (const s of items) {
      if (s.status === "Removed") continue;
      for (const req of requiredDocsFor(s)) {
        const alts = req.split("|");
        const match = s.docs.find((d) => alts.includes(d.type));
        if (!match) {
          out.push({
            supplierId: s.id,
            name: s.name,
            crit: s.crit,
            label: formatReqLabel(req),
            state: "missing",
          });
          continue;
        }
        const state = docState(match, lead);
        if (state === "expired" || state === "soon") {
          out.push({
            supplierId: s.id,
            name: s.name,
            crit: s.crit,
            label: match.type,
            state,
            docId: match.id,
          });
        }
      }
      for (const d of s.docs) {
        const state = docState(d, lead);
        if (
          (state === "expired" || state === "soon") &&
          !out.some((r) => r.docId === d.id)
        ) {
          out.push({
            supplierId: s.id,
            name: s.name,
            crit: s.crit,
            label: d.type,
            state,
            docId: d.id,
          });
        }
      }
    }
    const order = { expired: 0, missing: 1, soon: 2 };
    return out.sort((a, b) => order[a.state] - order[b.state]);
  }, [listQuery.data, lead]);

  if (listQuery.isLoading || settingsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading documents…
      </div>
    );
  }

  const notifyIds = [...new Set(rows.map((r) => r.supplierId))];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {notifyIds.length ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onNotify(notifyIds)}
          >
            <Mail className="size-3.5" />
            Notify all
          </Button>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="No document issues"
          description="All tracked documents are valid within the lead window."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="ims-table w-full text-sm">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Document</th>
                <th>State</th>
                <th className="w-[1%]" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.supplierId}-${row.label}-${i}`}>
                  <td>
                    <div className="font-medium">{row.name}</div>
                    <AslCritBadge crit={row.crit} />
                  </td>
                  <td>{row.label}</td>
                  <td>
                    <AslDocStateBadge state={row.state} />
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          onOpenSupplier(row.supplierId, "documents")
                        }
                      >
                        <ExternalLink className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => onNotify([row.supplierId])}
                      >
                        <Mail className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
