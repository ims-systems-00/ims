import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CircleCheck,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { RowActionsMenu } from "@/shared/components/row-actions-menu";
import { SearchInput } from "@/shared/components/search-input";
import { PageHeader } from "@/shared/layout";
import { notify } from "@/shared/lib/toast";
import { InvoiceSheet } from "../components/invoice-sheet";
import { InvoiceStatusBadge } from "../components/invoice-status-badge";
import {
  useDeleteInvoiceMutation,
  useDownloadInvoiceMutation,
  useInvoicesQuery,
  useMarkInvoicePaidMutation,
  useSendInvoiceMutation,
} from "../hooks/use-invoices";
import {
  INVOICE_STATUSES,
  type Invoice,
  type InvoiceStatus,
} from "../types";
import { formatDate } from "@/shared/lib/format-date";

const gbp = (n: number) => `£${n.toFixed(2)}`;

type PendingDelete = { id: string; label: string };

/**
 * Standalone CRM Invoices list (parity gap vs V4 `/invoices`).
 * URL sheet state: `?create=1` | `?invoice=<id>`
 */
export function InvoicesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<InvoiceStatus | "">("");
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
  const invoiceId = searchParams.get("invoice");
  const sheetOpen = createOpen || Boolean(invoiceId);

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: search || undefined,
      status: status || undefined,
    }),
    [page, search, status]
  );

  const listQuery = useInvoicesQuery(queryParams);
  const sendMutation = useSendInvoiceMutation();
  const paidMutation = useMarkInvoicePaidMutation();
  const deleteMutation = useDeleteInvoiceMutation();
  const downloadMutation = useDownloadInvoiceMutation();

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const pageSize = listQuery.data?.pageSize ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function openCreate() {
    setSearchParams({ create: "1" });
  }

  function openInvoice(id: string) {
    setSearchParams({ invoice: id });
  }

  function closeSheet() {
    setSearchParams({});
  }

  async function handleDownload(inv: Invoice) {
    try {
      const { filename, contentBase64 } = await downloadMutation.mutateAsync(
        inv.id
      );
      const bytes = Uint8Array.from(atob(contentBase64), (c) =>
        c.charCodeAt(0)
      );
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/pdf" })
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      notify.fromError(error, "Unable to download invoice");
    }
  }

  return (
    <div className="mx-auto max-w-8xl space-y-5">
      <PageHeader
        title="Invoices"
        description="Create, send, and track customer invoices for your organisation."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus /> New invoice
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by reference…"
          containerClassName="max-w-xs"
        />
        <select
          className="ims-select w-40"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as InvoiceStatus | "");
          }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {INVOICE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading invoices…
        </div>
      ) : null}

      {listQuery.isError ? (
        <p className="text-sm text-destructive">Unable to load invoices.</p>
      ) : null}

      {listQuery.isSuccess && total === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="No invoices yet"
          description="Create an invoice for a customer, or open a customer and use the Invoices tab."
          action={
            <Button type="button" onClick={openCreate}>
              <Plus /> New invoice
            </Button>
          }
        />
      ) : null}

      {listQuery.isSuccess && items.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((inv) => (
                <EntityTableRow
                  key={inv.id}
                  onOpen={() => openInvoice(inv.id)}
                >
                  <td className="px-4 py-3 font-medium">{inv.reference}</td>
                  <td className="max-w-[12rem] truncate px-4 py-3">
                    {inv.customerName}
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {gbp(inv.calculations.total)}
                  </td>
                  <td className="px-4 py-3">{formatDate(inv.dueDate)}</td>
                  <td className="px-4 py-3">{formatDate(inv.createdOn)}</td>
                  <td className="px-4 py-3">
                    <RowActionsMenu
                      label={`Actions for ${inv.reference}`}
                      actions={[
                        {
                          id: "view",
                          label: "View",
                          icon: <Eye />,
                          onSelect: () => openInvoice(inv.id),
                        },
                        ...(inv.status === "Draft"
                          ? [
                              {
                                id: "send",
                                label: "Send",
                                icon: <Send />,
                                onSelect: () =>
                                  void sendMutation
                                    .mutateAsync(inv.id)
                                    .then(() =>
                                      notify.success("Invoice sent")
                                    )
                                    .catch((e) =>
                                      notify.fromError(e, "Unable to send")
                                    ),
                              },
                            ]
                          : []),
                        ...(inv.status === "Sent"
                          ? [
                              {
                                id: "paid",
                                label: "Mark paid",
                                icon: <CircleCheck />,
                                onSelect: () =>
                                  void paidMutation
                                    .mutateAsync(inv.id)
                                    .then(() =>
                                      notify.success("Marked as paid")
                                    )
                                    .catch((e) =>
                                      notify.fromError(e, "Unable to mark paid")
                                    ),
                              },
                            ]
                          : []),
                        {
                          id: "download",
                          label: "Download PDF",
                          icon: <Download />,
                          onSelect: () => void handleDownload(inv),
                        },
                        ...(inv.status === "Draft"
                          ? [
                              {
                                id: "delete",
                                label: "Delete",
                                icon: <Trash2 />,
                                variant: "destructive" as const,
                                onSelect: () =>
                                  setPendingDelete({
                                    id: inv.id,
                                    label: inv.reference,
                                  }),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </td>
                </EntityTableRow>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {listQuery.isSuccess && totalPages > 1 ? (
        <div className="ims-pagination flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            {total} invoice{total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-muted-foreground">
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
        </div>
      ) : null}

      <InvoiceSheet
        open={sheetOpen}
        mode={createOpen ? "create" : "view"}
        invoiceId={invoiceId}
        onOpenChange={(next) => {
          if (!next) closeSheet();
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete draft invoice?"
        description={
          pendingDelete
            ? `Delete ${pendingDelete.label}? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          void deleteMutation
            .mutateAsync(pendingDelete.id)
            .then(() => {
              notify.success("Invoice deleted");
              setPendingDelete(null);
            })
            .catch((e) => notify.fromError(e, "Unable to delete invoice"));
        }}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      />
    </div>
  );
}
