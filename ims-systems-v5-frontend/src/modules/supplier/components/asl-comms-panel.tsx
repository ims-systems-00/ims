import { useMemo, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { Button } from "@/shared/components/ui/button";
import { useAslSuppliersQuery } from "../hooks/use-asl-supplier";
import {
  ASL_TABLE_PAGE_SIZE,
  AslTablePagination,
  paginateRows,
} from "./asl-table-pagination";

type AslCommsPanelProps = {
  onOpenSupplier: (id: string, tab?: string) => void;
};

export function AslCommsPanel({ onOpenSupplier }: AslCommsPanelProps) {
  const [page, setPage] = useState(1);
  const listQuery = useAslSuppliersQuery({
    page: 1,
    pageSize: 100,
    includeRemoved: true,
  });

  const rows = useMemo(() => {
    const items = listQuery.data?.items ?? [];
    return items
      .flatMap((s) =>
        s.comms.map((c) => ({
          ...c,
          supplierId: s.id,
          supplierName: s.name,
        }))
      )
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [listQuery.data]);

  const paged = paginateRows(rows, page, ASL_TABLE_PAGE_SIZE);

  if (listQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading communications…
      </div>
    );
  }

  if (!rows.length) {
    return (
      <EmptyState
        title="No communications yet"
        description="Notify actions and supplier uploads will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border-subtle">
        <table className="ims-table w-full text-sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Supplier</th>
              <th>Type</th>
              <th>Subject</th>
              <th>By</th>
              <th>Outcome</th>
              <th className="w-[1%]" />
            </tr>
          </thead>
          <tbody>
            {paged.items.map((row) => (
              <EntityTableRow
                key={`${row.supplierId}-${row.id}`}
                onOpen={() => onOpenSupplier(row.supplierId, "comms")}
              >
                <td>{row.date}</td>
                <td className="font-medium">{row.supplierName}</td>
                <td>{row.type}</td>
                <td>{row.subject}</td>
                <td>{row.by}</td>
                <td>{row.outcome}</td>
                <td>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onOpenSupplier(row.supplierId, "comms")}
                  >
                    <ExternalLink className="size-3.5" />
                  </Button>
                </td>
              </EntityTableRow>
            ))}
          </tbody>
        </table>
      </div>
      <AslTablePagination
        page={paged.page}
        totalPages={paged.totalPages}
        total={paged.total}
        pageSize={ASL_TABLE_PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}
