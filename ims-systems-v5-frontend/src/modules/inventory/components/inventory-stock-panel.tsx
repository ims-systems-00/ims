import { useState } from "react";
import { Plus } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { FormField } from "@/shared/components/form-field";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  useCreateInventoryStockMutation,
  useInventoryStockQuery,
  useMoveInventoryStockMutation,
} from "../hooks/use-inventory";
import {
  STOCK_MOVE_TYPES,
  type InventoryStockItem,
  type StockMoveType,
} from "../types";
import { PageLoader } from "@/shared/components/ims-loader";

type InventoryStockPanelProps = {
  canCreate?: boolean;
};

export function InventoryStockPanel({
  canCreate = true,
}: InventoryStockPanelProps) {
  const stockQuery = useInventoryStockQuery();
  const createMutation = useCreateInventoryStockMutation();
  const [createOpen, setCreateOpen] = useState(false);
  const [adjustId, setAdjustId] = useState<string | null>(null);

  const items = stockQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Consumables &amp; stock
          </h2>
          <p className="text-sm text-muted-foreground">
            Min/max levels, batch and expiry. Low stock can raise a purchase
            task.
          </p>
        </div>
        {canCreate ? (
          <Button type="button" onClick={() => setCreateOpen((v) => !v)}>
            <Plus className="size-4" /> Add item
          </Button>
        ) : null}
      </div>

      {createOpen && canCreate ? (
        <CreateStockForm
          pending={createMutation.isPending}
          onCancel={() => setCreateOpen(false)}
          onSubmit={async (body) => {
            try {
              await createMutation.mutateAsync(body);
              notify.success("Stock item created");
              setCreateOpen(false);
            } catch (error) {
              notify.fromError(error, "Unable to create stock item");
            }
          }}
        />
      ) : null}

      {stockQuery.isLoading ? (
        <PageLoader label="Loading stock…" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No stock items"
          description="Add consumables to track levels and expiry."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="ims-table w-full min-w-[720px]">
            <thead>
              <tr>
                <th>Code</th>
                <th>Item</th>
                <th>Location</th>
                <th>On hand</th>
                <th>Min / max</th>
                <th>Batch · expiry</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <EntityTableRow key={item.id}>
                  <td className="font-mono font-semibold">{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.location || "—"}</td>
                  <td>{item.qty}</td>
                  <td>
                    {item.min} / {item.max}
                  </td>
                  <td>
                    {item.batch || "—"}
                    {item.expiry ? ` · ${item.expiry}` : ""}
                  </td>
                  <td>
                    <StockStateBadge state={item.state} />
                  </td>
                  <td>
                    {canCreate ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setAdjustId((id) => (id === item.id ? null : item.id))
                        }
                      >
                        Adjust
                      </Button>
                    ) : null}
                  </td>
                </EntityTableRow>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adjustId ? (
        <AdjustStockForm
          item={items.find((i) => i.id === adjustId)!}
          onClose={() => setAdjustId(null)}
        />
      ) : null}
    </div>
  );
}

function StockStateBadge({ state }: { state?: string }) {
  const tone =
    state === "ok"
      ? "success"
      : state === "expsoon" || state === "low"
        ? "warning"
        : state === "expired"
          ? "destructive"
          : "neutral";
  return <StatusBadge tone={tone}>{state ?? "—"}</StatusBadge>;
}

function CreateStockForm({
  pending,
  onSubmit,
  onCancel,
}: {
  pending: boolean;
  onSubmit: (body: {
    code: string;
    name: string;
    location?: string;
    qty?: number;
    min?: number;
    max?: number;
    batch?: string;
    expiry?: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [qty, setQty] = useState("0");
  const [min, setMin] = useState("0");
  const [max, setMax] = useState("0");
  const [batch, setBatch] = useState("");
  const [expiry, setExpiry] = useState("");

  return (
    <form
      className="space-y-3 rounded-xl border border-border-subtle p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit({
          code,
          name,
          location,
          qty: Number(qty) || 0,
          min: Number(min) || 0,
          max: Number(max) || 0,
          batch,
          expiry: expiry || null,
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Code" required>
          <input
            className="ims-field"
            value={code}
            disabled={pending}
            onChange={(e) => setCode(e.target.value)}
          />
        </FormField>
        <FormField label="Item" required>
          <input
            className="ims-field"
            value={name}
            disabled={pending}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <FormField label="Location">
          <input
            className="ims-field"
            value={location}
            disabled={pending}
            onChange={(e) => setLocation(e.target.value)}
          />
        </FormField>
        <FormField label="Qty">
          <input
            type="number"
            min={0}
            className="ims-field"
            value={qty}
            disabled={pending}
            onChange={(e) => setQty(e.target.value)}
          />
        </FormField>
        <FormField label="Min">
          <input
            type="number"
            min={0}
            className="ims-field"
            value={min}
            disabled={pending}
            onChange={(e) => setMin(e.target.value)}
          />
        </FormField>
        <FormField label="Max">
          <input
            type="number"
            min={0}
            className="ims-field"
            value={max}
            disabled={pending}
            onChange={(e) => setMax(e.target.value)}
          />
        </FormField>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Batch">
          <input
            className="ims-field"
            value={batch}
            disabled={pending}
            onChange={(e) => setBatch(e.target.value)}
          />
        </FormField>
        <FormField label="Expiry">
          <input
            type="date"
            className="ims-field"
            value={expiry}
            disabled={pending}
            onChange={(e) => setExpiry(e.target.value)}
          />
        </FormField>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          Create
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function AdjustStockForm({
  item,
  onClose,
}: {
  item: InventoryStockItem;
  onClose: () => void;
}) {
  const moveMutation = useMoveInventoryStockMutation(item.id);
  const [type, setType] = useState<StockMoveType>("issue");
  const [qty, setQty] = useState("1");
  const [batch, setBatch] = useState("");
  const [expiry, setExpiry] = useState("");
  const [ref, setRef] = useState("");

  return (
    <form
      className="space-y-3 rounded-xl border border-border-subtle p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void (async () => {
          try {
            await moveMutation.mutateAsync({
              type,
              qty: Number(qty) || 0,
              batch: batch || undefined,
              expiry: expiry || null,
              ref: ref || undefined,
            });
            notify.success("Stock movement recorded");
            onClose();
          } catch (error) {
            notify.fromError(error, "Unable to adjust stock");
          }
        })();
      }}
    >
      <div className="text-sm font-semibold">
        Adjust {item.code} · {item.name}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Movement" required>
          <select
            className="ims-select ims-field"
            value={type}
            disabled={moveMutation.isPending}
            onChange={(e) => setType(e.target.value as StockMoveType)}
          >
            {STOCK_MOVE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Quantity" required>
          <input
            type="number"
            min={0}
            className="ims-field"
            value={qty}
            disabled={moveMutation.isPending}
            onChange={(e) => setQty(e.target.value)}
          />
        </FormField>
      </div>
      {type === "receive" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Batch">
            <input
              className="ims-field"
              value={batch}
              disabled={moveMutation.isPending}
              onChange={(e) => setBatch(e.target.value)}
            />
          </FormField>
          <FormField label="Expiry">
            <input
              type="date"
              className="ims-field"
              value={expiry}
              disabled={moveMutation.isPending}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </FormField>
        </div>
      ) : null}
      <FormField label="Reason / reference">
        <input
          className="ims-field"
          value={ref}
          disabled={moveMutation.isPending}
          onChange={(e) => setRef(e.target.value)}
        />
      </FormField>
      <div className="flex gap-2">
        <Button type="submit" disabled={moveMutation.isPending}>
          Record
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
