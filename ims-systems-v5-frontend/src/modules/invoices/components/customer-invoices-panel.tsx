import { useState } from "react";
import { Download, Loader2, Plus, Send, Trash2, CircleCheck } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/toast";
import {
  useCreateInvoiceMutation,
  useDeleteInvoiceMutation,
  useDownloadInvoiceMutation,
  useInvoicesQuery,
  useMarkInvoicePaidMutation,
  useSendInvoiceMutation,
} from "../hooks/use-invoices";
import type { InvoiceStatus } from "../types";

const STATUS_VARIANT: Record<InvoiceStatus, "destructive" | "secondary" | "default"> = {
  Draft: "destructive",
  Sent: "secondary",
  Paid: "default",
};

const gbp = (n: number) => `£${n.toFixed(2)}`;

/**
 * Customer Invoice panel (spec: invoice.md §8) — list, create with
 * line items, send / mark paid / download / delete (Draft only).
 */
export function CustomerInvoicesPanel({ customerId }: { customerId: string }) {
  const query = useInvoicesQuery(customerId);
  const createMutation = useCreateInvoiceMutation();
  const sendMutation = useSendInvoiceMutation();
  const paidMutation = useMarkInvoicePaidMutation();
  const deleteMutation = useDeleteInvoiceMutation();
  const downloadMutation = useDownloadInvoiceMutation();

  const [item, setItem] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [units, setUnits] = useState("1");
  const [vatRate, setVatRate] = useState("20");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));

  async function handleCreate(send: boolean) {
    const price = Number(unitPrice);
    const qty = Number(units);
    const vat = Number(vatRate);
    if (!item.trim() || !Number.isFinite(price) || price <= 0 || qty <= 0) {
      notify.error("Add an item with a positive price and quantity");
      return;
    }
    try {
      await createMutation.mutateAsync({
        customerId,
        dueDate,
        entries: [{ item: item.trim(), unitPrice: price, units: qty, vatRate: vat }],
        send,
      });
      notify.success(send ? "Invoice created and sent" : "Invoice created (Draft)");
      setItem("");
      setUnitPrice("");
    } catch (error) {
      notify.fromError(error, "Unable to create invoice");
    }
  }

  async function handleDownload(id: string) {
    try {
      const { filename, contentBase64 } = await downloadMutation.mutateAsync(id);
      const bytes = Uint8Array.from(atob(contentBase64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      notify.fromError(error, "Unable to download invoice");
    }
  }

  const invoices = query.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-5">
        <Input placeholder="Item / service" value={item} onChange={(e) => setItem(e.target.value)} className="sm:col-span-2" />
        <Input placeholder="Unit price £" type="number" min={0} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
        <Input placeholder="Qty" type="number" min={1} value={units} onChange={(e) => setUnits(e.target.value)} />
        <Input placeholder="VAT %" type="number" min={0} max={100} value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-44" />
        <Button type="button" size="sm" onClick={() => void handleCreate(false)} disabled={createMutation.isPending}>
          {createMutation.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
          Save draft
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => void handleCreate(true)} disabled={createMutation.isPending}>
          <Send /> Save and send
        </Button>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading invoices…</p>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices yet for this customer.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
              <span className="text-sm font-medium">{inv.reference}</span>
              <Badge variant={STATUS_VARIANT[inv.status]}>{inv.status}</Badge>
              <span className="text-sm text-muted-foreground">
                {gbp(inv.calculations.total)} · due {new Date(inv.dueDate).toLocaleDateString("en-GB")}
              </span>
              <span className="ml-auto flex gap-1">
                {inv.status === "Draft" ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => void sendMutation.mutateAsync(inv.id).then(() => notify.success("Invoice sent")).catch((e) => notify.fromError(e, "Unable to send invoice"))}>
                    <Send /> Send
                  </Button>
                ) : null}
                {inv.status === "Sent" ? (
                  <>
                    <Button type="button" size="sm" variant="ghost" onClick={() => void sendMutation.mutateAsync(inv.id).then(() => notify.success("Invoice resent")).catch((e) => notify.fromError(e, "Unable to resend invoice"))}>
                      <Send /> Resend
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => void paidMutation.mutateAsync(inv.id).then(() => notify.success("Invoice marked as paid")).catch((e) => notify.fromError(e, "Unable to mark paid"))}>
                      <CircleCheck /> Mark paid
                    </Button>
                  </>
                ) : null}
                <Button type="button" size="sm" variant="ghost" onClick={() => void handleDownload(inv.id)}>
                  <Download />
                </Button>
                {inv.status === "Draft" ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => void deleteMutation.mutateAsync(inv.id).then(() => notify.success("Invoice deleted")).catch((e) => notify.fromError(e, "Unable to delete invoice"))}>
                    <Trash2 />
                  </Button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
