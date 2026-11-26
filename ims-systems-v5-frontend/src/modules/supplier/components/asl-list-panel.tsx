import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Mail, Plus } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { SearchInput } from "@/shared/components/search-input";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { downloadAslCsv } from "../api/asl-supplier";
import { lastEval } from "../lib/asl-display";
import { useAslSuppliersQuery } from "../hooks/use-asl-supplier";
import {
  ASL_CRITICALITIES,
  ASL_STATUSES,
  type AslCriticality,
  type AslStatus,
} from "../types";
import { AslCritBadge, AslStatusBadge } from "./asl-badges";
import { PageLoader } from "@/shared/components/ims-loader";

type AslListPanelProps = {
  onOpenSupplier: (id: string) => void;
  onCreate: () => void;
  onNotify: (ids: string[]) => void;
  canCreate?: boolean;
};

export function AslListPanel({
  onOpenSupplier,
  onCreate,
  onNotify,
  canCreate = true,
}: AslListPanelProps) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [crit, setCrit] = useState<AslCriticality | "">("");
  const [status, setStatus] = useState<AslStatus | "">("");
  const [issueOnly, setIssueOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

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
      crit: crit || undefined,
      status: status || undefined,
      issue: issueOnly || undefined,
    }),
    [page, search, crit, status, issueOnly]
  );

  const listQuery = useAslSuppliersQuery(params);
  const items = listQuery.data?.items ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === items.length) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(items.map((s) => s.id)));
  }

  async function handleExport() {
    setExporting(true);
    try {
      await downloadAslCsv();
      notify.success("CSV downloaded");
    } catch (error) {
      notify.fromError(error, "Unable to export CSV");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="ims-toolbar flex-wrap">
        <SearchInput
          placeholder="Search name, reference, contact…"
          aria-label="Search suppliers"
          containerClassName="min-w-[14rem] flex-1"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          className="ims-select ims-field-sm w-auto min-w-[8rem]"
          value={crit}
          aria-label="Filter by criticality"
          onChange={(e) => {
            setPage(1);
            setCrit(e.target.value as AslCriticality | "");
          }}
        >
          <option value="">All criticality</option>
          {ASL_CRITICALITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="ims-select ims-field-sm w-auto min-w-[8rem]"
          value={status}
          aria-label="Filter by status"
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as AslStatus | "");
          }}
        >
          <option value="">All statuses</option>
          {ASL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
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
          {selected.size ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onNotify([...selected])}
            >
              <Mail className="size-3.5" />
              Notify selected ({selected.size})
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={exporting}
            onClick={() => void handleExport()}
          >
            {exporting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Export CSV
          </Button>
          {canCreate ? (
            <Button type="button" size="sm" onClick={onCreate}>
              <Plus className="size-3.5" />
              Add supplier
            </Button>
          ) : null}
        </div>
      </div>

      {listQuery.isLoading ? (
        <PageLoader label="Loading suppliers…" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No suppliers yet"
          description="Add a prospective supplier to start your approved supplier list."
          action={
            canCreate ? (
              <Button type="button" onClick={onCreate}>
                <Plus className="size-3.5" />
                Add supplier
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border-subtle">
            <table className="ims-table w-full text-sm">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={
                        items.length > 0 && selected.size === items.length
                      }
                      onChange={toggleAll}
                    />
                  </th>
                  <th>Supplier</th>
                  <th>Category</th>
                  <th>Criticality</th>
                  <th>Status</th>
                  <th>Last score</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => {
                  const eval_ = lastEval(s);
                  return (
                    <EntityTableRow
                      key={s.id}
                      onOpen={() => onOpenSupplier(s.id)}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggle(s.id)}
                          aria-label={`Select ${s.name}`}
                        />
                      </td>
                      <td>
                        <div className="font-medium">{s.name}</div>
                        <div className="ims-text-meta">{s.reference}</div>
                      </td>
                      <td>{s.cat}</td>
                      <td>
                        <AslCritBadge crit={s.crit} />
                      </td>
                      <td>
                        <AslStatusBadge status={s.status} />
                      </td>
                      <td>{eval_ ? eval_.score.toFixed(1) : "—"}</td>
                    </EntityTableRow>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="ims-text-meta">
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
