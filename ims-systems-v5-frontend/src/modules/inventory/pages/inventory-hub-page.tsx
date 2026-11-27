import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/shared/layout";
import { loadPublicEnv } from "@/shared/lib/env";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  permissionAllowed,
  useSecurityCapabilitiesQuery,
} from "@/modules/security/hooks/use-security-capabilities";
import { cn } from "@/shared/lib/utils";
import {
  downloadModelJson,
  downloadRegisterCsv,
  downloadScheduleCsv,
} from "../api/inventory";
import { InventoryAssetSheet } from "../components/inventory-asset-sheet";
import type { InventoryAssetSheetMode } from "../components/inventory-asset-sheet";
import { InventoryAuditorPanel } from "../components/inventory-auditor-panel";
import { InventoryCompliancePanel } from "../components/inventory-compliance-panel";
import { InventoryDisposalsPanel } from "../components/inventory-disposals-panel";
import { InventoryLabelsPanel } from "../components/inventory-labels-panel";
import { InventoryOverviewPanel } from "../components/inventory-overview-panel";
import { InventoryRegisterPanel } from "../components/inventory-register-panel";
import { InventorySchedulePanel } from "../components/inventory-schedule-panel";
import { InventorySettingsPanel } from "../components/inventory-settings-panel";
import { InventoryStockPanel } from "../components/inventory-stock-panel";
import { INVENTORY_VIEW_LABELS } from "../lib/inventory-display";
import {
  INVENTORY_HUB_VIEWS,
  type InventoryHubView,
} from "../types";
import { ModuleComplianceStrip } from "@/modules/live-compliance";

function parseView(value: string | null): InventoryHubView {
  if (value && (INVENTORY_HUB_VIEWS as readonly string[]).includes(value)) {
    return value as InventoryHubView;
  }
  return "overview";
}

/**
 * Inventory & Assets hub at `/inventory`.
 */
export function InventoryHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = parseView(searchParams.get("view"));
  const createOpen = searchParams.get("create") === "1";
  const assetId = searchParams.get("asset");
  const sheetTab = searchParams.get("tab") || "details";
  const [editMode, setEditMode] = useState(false);
  const [exporting, setExporting] = useState(false);

  const capsQuery = useSecurityCapabilitiesQuery();
  const provider = loadPublicEnv().VITE_SECURITY_PROVIDER;
  const canCreate = permissionAllowed(
    "inventory:create",
    capsQuery.data?.permissions,
    provider
  );

  const sheetOpen = createOpen || Boolean(assetId);
  const sheetMode: InventoryAssetSheetMode = createOpen
    ? "create"
    : editMode
      ? "edit"
      : "view";

  const paramsBase = useMemo(() => {
    return new URLSearchParams(searchParams);
  }, [searchParams]);

  function setView(next: InventoryHubView) {
    const params = new URLSearchParams(paramsBase);
    params.set("view", next);
    params.delete("create");
    params.delete("asset");
    params.delete("tab");
    setEditMode(false);
    setSearchParams(params);
  }

  function openCreate() {
    setEditMode(false);
    const params = new URLSearchParams(paramsBase);
    params.set("view", view === "overview" ? "register" : view);
    params.set("create", "1");
    params.delete("asset");
    params.delete("tab");
    setSearchParams(params);
  }

  function openAsset(id: string, tab = "details") {
    setEditMode(false);
    const params = new URLSearchParams(paramsBase);
    params.delete("create");
    params.set("asset", id);
    params.set("tab", tab);
    setSearchParams(params);
  }

  function closeSheet() {
    setEditMode(false);
    const params = new URLSearchParams(paramsBase);
    params.delete("create");
    params.delete("asset");
    params.delete("tab");
    setSearchParams(params);
  }

  async function handleExport(
    fn: () => Promise<void>,
    label: string
  ) {
    setExporting(true);
    try {
      await fn();
      notify.success(`${label} downloaded`);
    } catch (error) {
      notify.fromError(error, `Unable to export ${label}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory & assets"
        description="Asset register, lifecycle, inspections, stock, QR scanning and auditor evidence."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={exporting}
              onClick={() =>
                void handleExport(downloadRegisterCsv, "Register CSV")
              }
            >
              <Download className="size-3.5" /> Register CSV
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={exporting}
              onClick={() =>
                void handleExport(downloadScheduleCsv, "Schedule CSV")
              }
            >
              <Download className="size-3.5" /> Schedule CSV
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={exporting}
              onClick={() => void handleExport(downloadModelJson, "JSON")}
            >
              <Download className="size-3.5" /> JSON
            </Button>
          </div>
        }
      />
      <ModuleComplianceStrip module="inventory" />

      <div
        className="flex flex-wrap gap-1 border-b border-border-subtle"
        role="tablist"
        aria-label="Inventory views"
      >
        {INVENTORY_HUB_VIEWS.map((id) => {
          const selected = view === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={cn(
                "relative px-3.5 py-2.5 text-sm font-medium transition-colors",
                selected
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setView(id)}
            >
              {INVENTORY_VIEW_LABELS[id]}
              {selected ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </button>
          );
        })}
      </div>

      {view === "overview" ? (
        <InventoryOverviewPanel
          onOpenAsset={(id) => openAsset(id)}
          onJumpView={setView}
        />
      ) : null}
      {view === "register" ? (
        <InventoryRegisterPanel
          onOpenAsset={(id) => openAsset(id)}
          onCreate={openCreate}
          canCreate={canCreate}
        />
      ) : null}
      {view === "schedule" ? (
        <InventorySchedulePanel
          onOpenAsset={(id, tab) => openAsset(id, tab)}
        />
      ) : null}
      {view === "labels" ? (
        <InventoryLabelsPanel onOpenAsset={(id) => openAsset(id)} />
      ) : null}
      {view === "stock" ? (
        <InventoryStockPanel canCreate={canCreate} />
      ) : null}
      {view === "disposals" ? (
        <InventoryDisposalsPanel
          onOpenAsset={(id, tab) => openAsset(id, tab)}
        />
      ) : null}
      {view === "compliance" ? <InventoryCompliancePanel /> : null}
      {view === "auditor" ? <InventoryAuditorPanel /> : null}
      {view === "settings" ? (
        <InventorySettingsPanel canEdit={canCreate} />
      ) : null}

      <InventoryAssetSheet
        open={sheetOpen}
        mode={sheetMode}
        assetId={assetId}
        initialTab={sheetTab}
        onOpenChange={(next) => {
          if (!next) closeSheet();
        }}
        onModeChange={(mode) => setEditMode(mode === "edit")}
        canCreate={canCreate}
      />
    </div>
  );
}
