import { useState } from "react";
import {
  CircleCheck,
  Download,
  Loader2,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { FormField } from "@/shared/components/form-field";
import { notify } from "@/shared/lib/toast";
import { formatDate } from "@/shared/lib/format-date";
import { useCustomersQuery } from "@/modules/customers/hooks/use-customers";
import {
  useCreateInvoiceMutation,
  useDeleteInvoiceMutation,
  useDownloadInvoiceMutation,
  useInvoiceQuery,
  useMarkInvoicePaidMutation,
  useSendInvoiceMutation,
} from "../hooks/use-invoices";
import { InvoiceStatusBadge } from "./invoice-status-badge";

const gbp = (n: number) => `£${n.toFixed(2)}`;

export type InvoiceSheetMode = "create" | "view";

type InvoiceSheetProps = {
  open: boolean;
  mode: InvoiceSheetMode;
  invoiceId?: string | null;
  onOpenChange: (open: boolean) => void;
};

async function downloadPdf(
  download: (id: string) => Promise<{ filename: string; contentBase64: string }>,
  id: string
) {
  const { filename, contentBase64 } = await download(id);
  const bytes = Uint8Array.from(atob(contentBase64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Invoice create / view sheet for the standalone Invoices page.
 */
export function InvoiceSheet({
  open,
  mode,
  invoiceId,
  onOpenChange,
}: InvoiceSheetProps) {
  const invoiceQuery = useInvoiceQuery(
    invoiceId ?? undefined,
    open && mode === "view" && Boolean(invoiceId)
  );
  const customersQuery = useCustomersQuery({ page: 1, pageSize: 100 });
  const createMutation = useCreateInvoiceMutation();
  const sendMutation = useSendInvoiceMutation();
  const paidMutation = useMarkInvoicePaidMutation();
  const deleteMutation = useDeleteInvoiceMutation();
  const downloadMutation = useDownloadInvoiceMutation();

  const [customerId, setCustomerId] = useState("");
  const [item, setItem] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [units, setUnits] = useState("1");
  const [vatRate, setVatRate] = useState("20");
  const [dueDate, setDueDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const invoice = invoiceQuery.data;
  const busy =
    createMutation.isPending ||
    sendMutation.isPending ||
    paidMutation.isPending ||
    deleteMutation.isPending ||
    downloadMutation.isPending;

  async function handleCreate(send: boolean) {
    const price = Number(unitPrice);
    const qty = Number(units);
    const vat = Number(vatRate);
    if (!customerId) {
      notify.error("Select a customer");
      return;
    }
    if (!item.trim() || !Number.isFinite(price) || price <= 0 || qty <= 0) {
      notify.error("Add an item with a positive price and quantity");
      return;
    }
    try {
      await createMutation.mutateAsync({
        customerId,
        dueDate,
        entries: [
          { item: item.trim(), unitPrice: price, units: qty, vatRate: vat },
        ],
        send,
      });
      notify.success(
        send ? "Invoice created and sent" : "Invoice created (Draft)"
      );
      setItem("");
      setUnitPrice("");
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to create invoice");
    }
  }

  const createFooter =
    mode === "create" ? (
      <>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => void handleCreate(true)}
        >
          {createMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Send className="size-3.5" aria-hidden />
          )}
          Save and send
        </Button>
        <Button
          type="button"
          disabled={busy}
          onClick={() => void handleCreate(false)}
        >
          {createMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Plus className="size-3.5" aria-hidden />
          )}
          Save draft
        </Button>
      </>
    ) : undefined;

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        mode === "create" ? "New invoice" : (invoice?.reference ?? "Invoice")
      }
      description={
        mode === "create"
          ? "Create a draft or send immediately to the customer contacts."
          : "View totals and run send / paid / download actions."
      }
      footer={createFooter}
    >
      <div className="space-y-5">
        {mode === "create" ? (
          <>
            <FormField label="Customer" htmlFor="invoice-customer" required>
              <select
                id="invoice-customer"
                className="ims-select"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Select customer</option>
                {(customersQuery.data?.items ?? []).map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Due date" htmlFor="invoice-due" required>
              <Input
                id="invoice-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </FormField>
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Line item</p>
              <FormField label="Item / service" htmlFor="invoice-item" required>
                <Input
                  id="invoice-item"
                  placeholder="e.g. Consulting"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                />
              </FormField>
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField label="Unit price £" htmlFor="invoice-price" required>
                  <Input
                    id="invoice-price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                  />
                </FormField>
                <FormField label="Qty" htmlFor="invoice-qty" required>
                  <Input
                    id="invoice-qty"
                    type="number"
                    min={1}
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                  />
                </FormField>
                <FormField label="VAT %" htmlFor="invoice-vat">
                  <Input
                    id="invoice-vat"
                    type="number"
                    min={0}
                    max={100}
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                  />
                </FormField>
              </div>
            </div>
          </>
        ) : invoiceQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !invoice ? (
          <p className="text-sm text-destructive">Invoice not found.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <InvoiceStatusBadge status={invoice.status} />
              <span className="text-sm text-muted-foreground">
                {invoice.customerName}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Total</dt>
                <dd className="mt-0.5 font-medium">
                  {gbp(invoice.calculations.total)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">VAT</dt>
                <dd className="mt-0.5 font-medium">
                  {gbp(invoice.calculations.vatFigure)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Due</dt>
                <dd className="mt-0.5 font-medium">
                  {formatDate(invoice.dueDate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Created</dt>
                <dd className="mt-0.5 font-medium">
                  {formatDate(invoice.createdOn)}
                </dd>
              </div>
            </dl>
            <div className="space-y-2">
              <p className="text-sm font-medium">Line items</p>
              <ul className="divide-y divide-border overflow-hidden rounded-md border border-border text-sm">
                {invoice.entries.map((entry, index) => (
                  <li
                    key={`${entry.item}-${index}`}
                    className="flex justify-between gap-3 px-3 py-2.5"
                  >
                    <span>
                      {entry.item} × {entry.units}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {gbp(entry.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              {invoice.status === "Draft" ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void sendMutation
                      .mutateAsync(invoice.id)
                      .then(() => notify.success("Invoice sent"))
                      .catch((e) => notify.fromError(e, "Unable to send"))
                  }
                >
                  <Send className="size-3.5" aria-hidden /> Send
                </Button>
              ) : null}
              {invoice.status === "Sent" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    void paidMutation
                      .mutateAsync(invoice.id)
                      .then(() => notify.success("Marked as paid"))
                      .catch((e) =>
                        notify.fromError(e, "Unable to mark paid")
                      )
                  }
                >
                  <CircleCheck className="size-3.5" aria-hidden /> Mark paid
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void downloadPdf(
                    (id) => downloadMutation.mutateAsync(id),
                    invoice.id
                  ).catch((e) => notify.fromError(e, "Unable to download"))
                }
              >
                <Download className="size-3.5" aria-hidden /> PDF
              </Button>
              {invoice.status === "Draft" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={() =>
                    void deleteMutation
                      .mutateAsync(invoice.id)
                      .then(() => {
                        notify.success("Invoice deleted");
                        onOpenChange(false);
                      })
                      .catch((e) => notify.fromError(e, "Unable to delete"))
                  }
                >
                  <Trash2 className="size-3.5" aria-hidden /> Delete
                </Button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </AppSheet>
  );
}
