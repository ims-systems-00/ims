import { useMemo } from "react";
import { ExternalLink, FileText, Loader2, Mail } from "lucide-react";
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

/**
 * Hub Documents tab: attention queue (missing / expiring) plus a register of
 * every document on file. Open a row to view / download in the supplier sheet.
 */
export function AslDocsPanel({ onOpenSupplier, onNotify }: AslDocsPanelProps) {
  const listQuery = useAslSuppliersQuery({ page: 1, pageSize: 100 });
  const settingsQuery = useAslSettingsQuery();
  const lead = settingsQuery.data?.lead ?? 30;

  const { issues, register } = useMemo(() => {
    const items = listQuery.data?.items ?? [];
    const issueRows: Array<{
      supplierId: string;
      name: string;
      crit: string;
      label: string;
      state: "missing" | "expired" | "soon";
      docId?: string;
      fileName?: string;
    }> = [];
    const registerRows: Array<{
      supplierId: string;
      name: string;
      crit: string;
      type: string;
      exp: string | null;
      state: ReturnType<typeof docState>;
      fileName: string | null;
      docId: string;
    }> = [];

    for (const s of items) {
      if (s.status === "Removed") continue;

      for (const req of requiredDocsFor(s)) {
        const alts = req.split("|");
        const match = s.docs.find((d) => alts.includes(d.type));
        if (!match) {
          issueRows.push({
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
          issueRows.push({
            supplierId: s.id,
            name: s.name,
            crit: s.crit,
            label: match.type,
            state,
            docId: match.id,
            fileName: match.file?.Name,
          });
        }
      }

      for (const d of s.docs) {
        const state = docState(d, lead);
        if (
          (state === "expired" || state === "soon") &&
          !issueRows.some((r) => r.docId === d.id)
        ) {
          issueRows.push({
            supplierId: s.id,
            name: s.name,
            crit: s.crit,
            label: d.type,
            state,
            docId: d.id,
            fileName: d.file?.Name,
          });
        }
        registerRows.push({
          supplierId: s.id,
          name: s.name,
          crit: s.crit,
          type: d.type,
          exp: d.exp,
          state,
          fileName: d.file?.Name ?? null,
          docId: d.id,
        });
      }
    }

    const order = { expired: 0, missing: 1, soon: 2 };
    issueRows.sort((a, b) => order[a.state] - order[b.state]);
    registerRows.sort((a, b) => a.name.localeCompare(b.name) || a.type.localeCompare(b.type));
    return { issues: issueRows, register: registerRows };
  }, [listQuery.data, lead]);

  if (listQuery.isLoading || settingsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading documents…
      </div>
    );
  }

  const notifyIds = [...new Set(issues.map((r) => r.supplierId))];

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Needs attention</h2>
            <p className="ims-text-meta">
              Missing, expired, or soon-to-expire required documents
            </p>
          </div>
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

        {issues.length === 0 ? (
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
                {issues.map((row, i) => (
                  <tr key={`${row.supplierId}-${row.label}-${i}`}>
                    <td>
                      <div className="font-medium">{row.name}</div>
                      <AslCritBadge crit={row.crit} />
                    </td>
                    <td>
                      <div>{row.label}</div>
                      {row.fileName ? (
                        <div className="ims-text-meta flex items-center gap-1">
                          <FileText className="size-3" />
                          {row.fileName}
                        </div>
                      ) : null}
                    </td>
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
                          Open
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
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Document register</h2>
          <p className="ims-text-meta">
            Every document on file across the ASL — open a supplier to view or
            download the file
          </p>
        </div>

        {register.length === 0 ? (
          <EmptyState
            title="No documents yet"
            description="Add documents from a supplier’s Documents tab in the side sheet."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border-subtle">
            <table className="ims-table w-full text-sm">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Type</th>
                  <th>File</th>
                  <th>Expiry</th>
                  <th>State</th>
                  <th className="w-[1%]" />
                </tr>
              </thead>
              <tbody>
                {register.map((row) => (
                  <tr key={row.docId}>
                    <td>
                      <div className="font-medium">{row.name}</div>
                      <AslCritBadge crit={row.crit} />
                    </td>
                    <td>{row.type}</td>
                    <td>
                      {row.fileName ? (
                        <span className="inline-flex items-center gap-1">
                          <FileText className="size-3.5 text-muted-foreground" />
                          {row.fileName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No file</span>
                      )}
                    </td>
                    <td>{row.exp || "—"}</td>
                    <td>
                      <AslDocStateBadge state={row.state} />
                    </td>
                    <td>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onOpenSupplier(row.supplierId, "documents")
                        }
                      >
                        <ExternalLink className="size-3.5" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
