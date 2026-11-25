import { useMemo, useState } from "react";
import { Copy, Download, FileText, Loader2 } from "lucide-react";
import { useCurrentOrganisationQuery } from "@/modules/organisation";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  downloadAuditorPackPdf,
  downloadFixedAssetsCsv,
  downloadModelJson,
  downloadRegisterCsv,
  downloadScheduleCsv,
  openAuditorPack,
} from "../api/inventory";
import { useInventorySettingsQuery } from "../hooks/use-inventory";
import { inventoryScanUrl } from "../lib/qr";

export function InventoryAuditorPanel() {
  const [busy, setBusy] = useState<string | null>(null);
  const orgQuery = useCurrentOrganisationQuery();
  const settingsQuery = useInventorySettingsQuery();

  const scanExample = useMemo(() => {
    const orgId = orgQuery.data?.id;
    if (!orgId || typeof window === "undefined") return "";
    return inventoryScanUrl(
      window.location.origin,
      orgId,
      "ME-0001",
      settingsQuery.data?.scanBase
    );
  }, [orgQuery.data?.id, settingsQuery.data?.scanBase]);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
      notify.success("Ready");
    } catch (error) {
      notify.fromError(error, "Export failed");
    } finally {
      setBusy(null);
    }
  }

  async function copyScanExample() {
    if (!scanExample) {
      notify.error("Organisation not loaded");
      return;
    }
    try {
      await navigator.clipboard.writeText(scanExample);
      notify.success("Scan URL copied");
    } catch {
      notify.error("Unable to copy");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Auditor pack</h2>
        <p className="text-sm text-muted-foreground">
          Live evidence pack for auditors — register, calibration, statutory
          inspections, disposals, consumables, and self-check.
        </p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void run("pack", openAuditorPack)}
          >
            {busy === "pack" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
            Open / print pack
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(busy)}
            onClick={() => void run("pdf", downloadAuditorPackPdf)}
          >
            {busy === "pdf" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Download PDF
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border-subtle bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Remote audit</h3>
        <p className="text-sm text-muted-foreground">
          Share the printable auditor pack and the public scan route so an
          external auditor can open evidence and verify labelled assets by QR
          without a full IMS login (unless scan login is required in Settings).
        </p>
        {scanExample ? (
          <div className="rounded-lg bg-muted/40 px-3 py-2 font-mono text-xs break-all">
            {scanExample}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Loading scan URL…</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!scanExample}
            onClick={() => void copyScanExample()}
          >
            <Copy className="size-3.5" />
            Copy example scan URL
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={Boolean(busy)}
            onClick={() => void run("pack2", openAuditorPack)}
          >
            <FileText className="size-3.5" />
            Open pack
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border-subtle bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Exports</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(busy)}
            onClick={() => void run("reg", downloadRegisterCsv)}
          >
            {busy === "reg" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Register CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(busy)}
            onClick={() => void run("sch", downloadScheduleCsv)}
          >
            {busy === "sch" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Schedule CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(busy)}
            onClick={() => void run("fa", downloadFixedAssetsCsv)}
          >
            {busy === "fa" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Fixed assets CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(busy)}
            onClick={() => void run("json", downloadModelJson)}
          >
            {busy === "json" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            JSON
          </Button>
        </div>
      </div>
    </div>
  );
}
