import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MapPin, Printer } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { getActiveOrganisationId } from "@/shared/lib/active-organisation";
import { useCurrentOrganisationQuery } from "@/modules/organisation";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import {
  useInventoryAssetsQuery,
  useInventorySettingsQuery,
  useMarkInventoryLabelledMutation,
} from "../hooks/use-inventory";
import { dueLabel } from "../lib/inventory-display";
import { openInventoryLabelPrintSheet } from "../lib/print-labels";
import { inventoryScanUrl, qrDataUrl } from "../lib/qr";
import type { InventoryAsset } from "../types";
import { InventoryDueBadge, InventoryStageBadge } from "./inventory-badges";

type InventoryLabelsPanelProps = {
  onOpenAsset: (id: string) => void;
};

export function InventoryLabelsPanel({
  onOpenAsset,
}: InventoryLabelsPanelProps) {
  const [filter, setFilter] = useState<"" | "new">("");
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const listQuery = useInventoryAssetsQuery({ page: 1, pageSize: 100 });
  const settingsQuery = useInventorySettingsQuery();
  const orgQuery = useCurrentOrganisationQuery();
  const markMutation = useMarkInventoryLabelledMutation();

  const items = useMemo(() => {
    const all = listQuery.data?.items ?? [];
    return filter === "new" ? all.filter((a) => !a.labelPrinted) : all;
  }, [listQuery.data, filter]);

  const orgId = getActiveOrganisationId() ?? "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    if (!items.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !items.some((a) => a.id === selectedId)) {
      setSelectedId(items[0]!.id);
    }
  }, [items, selectedId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const next: Record<string, string> = {};
      for (const asset of items.slice(0, 60)) {
        const url = inventoryScanUrl(
          origin,
          orgId || asset.organizationId,
          asset.tag,
          settingsQuery.data?.scanBase
        );
        next[asset.id] = await qrDataUrl(url, 160);
        if (cancelled) return;
      }
      if (!cancelled) setQrMap(next);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [items, orgId, origin, settingsQuery.data?.scanBase]);

  const selected = items.find((a) => a.id === selectedId) ?? null;
  const selectedUrl = selected
    ? inventoryScanUrl(
        origin,
        orgId || selected.organizationId,
        selected.tag,
        settingsQuery.data?.scanBase
      )
    : "";

  async function markPrinted() {
    const ids = items.filter((a) => !a.labelPrinted).map((a) => a.id);
    if (!ids.length) {
      notify.info("All visible assets already marked printed");
      return;
    }
    try {
      const res = await markMutation.mutateAsync(ids);
      notify.success(`Marked ${res.updated} label(s) printed`);
    } catch (error) {
      notify.fromError(error, "Unable to mark labelled");
    }
  }

  async function handlePrintSheet() {
    if (!items.length) {
      notify.error("No labels to print");
      return;
    }
    setPrinting(true);
    try {
      const labels = [];
      for (const asset of items.slice(0, 60)) {
        const scanUrl = inventoryScanUrl(
          origin,
          orgId || asset.organizationId,
          asset.tag,
          settingsQuery.data?.scanBase
        );
        const qr = qrMap[asset.id] || (await qrDataUrl(scanUrl, 200));
        labels.push({
          tag: asset.tag,
          name: asset.name,
          category: asset.category,
          qrDataUrl: qr,
          scanUrl,
        });
      }
      openInventoryLabelPrintSheet(labels, orgQuery.data?.name);
    } catch (error) {
      notify.fromError(error, "Unable to open print sheet");
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            QR labels &amp; scanning
          </h2>
          <p className="text-sm text-muted-foreground">
            Print cuttable labels. Scanning opens the asset status card on a
            phone.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="ims-select ims-field-sm w-auto"
            value={filter}
            aria-label="Label filter"
            onChange={(e) => setFilter(e.target.value as "" | "new")}
          >
            <option value="">All assets</option>
            <option value="new">Not yet labelled</option>
          </select>
          <Button
            type="button"
            variant="outline"
            disabled={printing || items.length === 0}
            onClick={() => void handlePrintSheet()}
          >
            {printing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Printer className="size-4" />
            )}
            Print sheet
          </Button>
          <Button
            type="button"
            disabled={markMutation.isPending}
            onClick={() => void markPrinted()}
          >
            Mark printed
          </Button>
        </div>
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading labels…
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No assets to label"
          description="Add assets to the register first."
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((asset) => {
              const url = inventoryScanUrl(
                origin,
                orgId || asset.organizationId,
                asset.tag,
                settingsQuery.data?.scanBase
              );
              const active = asset.id === selectedId;
              return (
                <button
                  key={asset.id}
                  type="button"
                  className={cn(
                    "rounded-lg border bg-card p-3 text-left transition-colors",
                    active
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-border-subtle hover:border-primary/40"
                  )}
                  onClick={() => setSelectedId(asset.id)}
                  onDoubleClick={() => onOpenAsset(asset.id)}
                >
                  <div className="flex items-center gap-3">
                    {qrMap[asset.id] ? (
                      <img
                        src={qrMap[asset.id]}
                        alt={`QR ${asset.tag}`}
                        className="size-20 shrink-0 bg-white p-1"
                      />
                    ) : (
                      <div className="flex size-20 items-center justify-center bg-muted text-xs text-muted-foreground">
                        QR…
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-semibold">
                        {asset.tag}
                      </div>
                      <div className="truncate text-sm">{asset.name}</div>
                      <div className="mt-1 truncate text-[10px] text-muted-foreground">
                        {url}
                      </div>
                      {!asset.labelPrinted ? (
                        <div className="mt-1 text-[10px] font-medium uppercase text-amber-700 dark:text-amber-400">
                          Not labelled
                        </div>
                      ) : (
                        <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium uppercase text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" /> Labelled
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <aside className="xl:sticky xl:top-4 xl:self-start">
            <MobileScanPreview
              asset={selected}
              qrDataUrl={selected ? qrMap[selected.id] : undefined}
              scanUrl={selectedUrl}
              onOpenAsset={onOpenAsset}
            />
          </aside>
        </div>
      )}
    </div>
  );
}

function MobileScanPreview({
  asset,
  qrDataUrl: qr,
  scanUrl,
  onOpenAsset,
}: {
  asset: InventoryAsset | null;
  qrDataUrl?: string;
  scanUrl: string;
  onOpenAsset: (id: string) => void;
}) {
  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-[320px]">
        <div className="rounded-[2rem] bg-foreground/90 p-2.5">
          <div className="min-h-[520px] overflow-hidden rounded-[1.55rem] bg-background">
            <div className="flex h-7 items-center justify-center bg-surface-muted">
              <div className="h-1.5 w-20 rounded-full bg-border" />
            </div>

            {!asset ? (
              <div className="flex min-h-[460px] items-center justify-center px-4 text-center text-xs text-muted-foreground">
                Select a label to preview
              </div>
            ) : (
              <div className="space-y-3 px-3.5 py-4">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    iMS · Inventory scan
                  </div>
                  <div className="mt-1 font-mono text-xl font-bold leading-none">
                    {asset.tag}
                  </div>
                  <div className="mt-1.5 text-sm leading-snug">{asset.name}</div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <InventoryStageBadge stage={asset.stage} />
                  <InventoryDueBadge state={asset.nextDueState} />
                </div>

                <div className="rounded-xl border border-border-subtle bg-surface-muted/50 p-3">
                  <div className="flex items-start gap-3">
                    {qr ? (
                      <img
                        src={qr}
                        alt=""
                        className="size-16 shrink-0 rounded bg-white p-0.5"
                      />
                    ) : (
                      <div className="flex size-16 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                        QR
                      </div>
                    )}
                    <div className="min-w-0 text-xs">
                      <div className="font-medium">{asset.category}</div>
                      <div className="mt-1 flex items-center gap-1 text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">
                          {asset.location || "No location"}
                        </span>
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        Due: {dueLabel(asset.nextDueState)}
                        {asset.nextDue ? ` · ${asset.nextDue}` : ""}
                      </div>
                      {asset.okToUse === false ? (
                        <div className="mt-2 rounded-md bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-destructive">
                          Do not use
                        </div>
                      ) : (
                        <div className="mt-2 rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                          OK to use
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {["Report fault", "Sighting", "Move", "Record check"].map(
                    (label) => (
                      <div
                        key={label}
                        className="rounded-lg border border-border-subtle px-2 py-2.5 text-center text-[11px] font-medium text-muted-foreground"
                      >
                        {label}
                      </div>
                    )
                  )}
                </div>

                <p className="break-all text-center font-mono text-[8px] leading-relaxed text-muted-foreground">
                  {scanUrl}
                </p>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenAsset(asset.id)}
                  >
                    Open asset
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!scanUrl) return;
                      window.open(scanUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Live scan
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
