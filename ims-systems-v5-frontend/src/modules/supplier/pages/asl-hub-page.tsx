import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/shared/layout";
import { loadPublicEnv } from "@/shared/lib/env";
import {
  permissionAllowed,
  useSecurityCapabilitiesQuery,
} from "@/modules/security/hooks/use-security-capabilities";
import { cn } from "@/shared/lib/utils";
import { ASL_VIEW_LABELS } from "../lib/asl-display";
import {
  ASL_HUB_VIEWS,
  type AslHubView,
  type AslNotifyResult,
} from "../types";
import { AslAuditorPanel } from "../components/asl-auditor-panel";
import { AslCommsPanel } from "../components/asl-comms-panel";
import { AslDocsPanel } from "../components/asl-docs-panel";
import { AslEvalsPanel } from "../components/asl-evals-panel";
import { AslListPanel } from "../components/asl-list-panel";
import {
  AslNotifyDialog,
  AslNotifyResults,
} from "../components/asl-notify-dialog";
import { AslOverviewPanel } from "../components/asl-overview-panel";
import { AslSettingsPanel } from "../components/asl-settings-panel";
import {
  AslSupplierSheet,
  type AslSupplierSheetMode,
} from "../components/asl-supplier-sheet";

function parseView(value: string | null): AslHubView {
  if (value && (ASL_HUB_VIEWS as string[]).includes(value)) {
    return value as AslHubView;
  }
  return "overview";
}

/**
 * ASL Supplier & Contractor hub — tabbed shell at `/suppliers`.
 */
export function AslHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = parseView(searchParams.get("view"));
  const createOpen = searchParams.get("create") === "1";
  const supplierId = searchParams.get("supplier");
  const sheetTab = searchParams.get("tab") || "overview";
  const [editMode, setEditMode] = useState(false);
  const [notifyIds, setNotifyIds] = useState<string[]>([]);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyResults, setNotifyResults] = useState<AslNotifyResult[]>([]);

  const capsQuery = useSecurityCapabilitiesQuery();
  const provider = loadPublicEnv().VITE_SECURITY_PROVIDER;
  const canCreate = permissionAllowed(
    "suppliers:create",
    capsQuery.data?.permissions,
    provider
  );
  const canDelete = permissionAllowed(
    "suppliers:delete",
    capsQuery.data?.permissions,
    provider
  );

  const sheetOpen = createOpen || Boolean(supplierId);
  const sheetMode: AslSupplierSheetMode = createOpen
    ? "create"
    : editMode
      ? "edit"
      : "view";

  const paramsBase = useMemo(() => {
    const next = new URLSearchParams(searchParams);
    return next;
  }, [searchParams]);

  function setView(next: AslHubView) {
    const params = new URLSearchParams(paramsBase);
    params.set("view", next);
    params.delete("create");
    params.delete("supplier");
    params.delete("tab");
    setEditMode(false);
    setSearchParams(params);
  }

  function openCreate() {
    setEditMode(false);
    const params = new URLSearchParams(paramsBase);
    params.set("view", view === "settings" ? "asl" : view);
    params.set("create", "1");
    params.delete("supplier");
    params.delete("tab");
    setSearchParams(params);
  }

  function openSupplier(id: string, tab = "overview") {
    setEditMode(false);
    const params = new URLSearchParams(paramsBase);
    params.delete("create");
    params.set("supplier", id);
    params.set("tab", tab);
    setSearchParams(params);
  }

  function closeSheet() {
    setEditMode(false);
    const params = new URLSearchParams(paramsBase);
    params.delete("create");
    params.delete("supplier");
    params.delete("tab");
    setSearchParams(params);
  }

  function requestNotify(ids: string[]) {
    setNotifyIds(ids);
    setNotifyOpen(true);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Suppliers & contractors"
        description="Approved supplier list, document control, evaluations, and auditor pack."
      />

      <div
        className="flex flex-wrap gap-1 border-b border-border-subtle"
        role="tablist"
        aria-label="ASL views"
      >
        {ASL_HUB_VIEWS.map((id) => {
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
              {ASL_VIEW_LABELS[id]}
              {selected ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </button>
          );
        })}
      </div>

      {notifyResults.length ? (
        <AslNotifyResults
          results={notifyResults}
          onClear={() => setNotifyResults([])}
        />
      ) : null}

      {view === "overview" ? (
        <AslOverviewPanel
          onOpenSupplier={(id) => openSupplier(id)}
          onNotify={requestNotify}
          onJumpView={(v) => setView(v)}
        />
      ) : null}
      {view === "asl" ? (
        <AslListPanel
          onOpenSupplier={(id) => openSupplier(id)}
          onCreate={openCreate}
          onNotify={requestNotify}
          canCreate={canCreate}
        />
      ) : null}
      {view === "documents" ? (
        <AslDocsPanel
          onOpenSupplier={(id, tab) => openSupplier(id, tab)}
          onNotify={requestNotify}
        />
      ) : null}
      {view === "evaluations" ? (
        <AslEvalsPanel
          onOpenSupplier={(id, tab) => openSupplier(id, tab)}
        />
      ) : null}
      {view === "comms" ? (
        <AslCommsPanel
          onOpenSupplier={(id, tab) => openSupplier(id, tab)}
        />
      ) : null}
      {view === "auditor" ? <AslAuditorPanel /> : null}
      {view === "settings" ? (
        <AslSettingsPanel canEdit={canCreate} />
      ) : null}

      <AslSupplierSheet
        open={sheetOpen}
        mode={sheetMode}
        supplierId={supplierId}
        initialTab={sheetTab}
        onOpenChange={(next) => {
          if (!next) closeSheet();
        }}
        onModeChange={(mode) => setEditMode(mode === "edit")}
        canCreate={canCreate}
        canDelete={canDelete}
      />

      <AslNotifyDialog
        open={notifyOpen}
        onOpenChange={setNotifyOpen}
        ids={notifyIds}
        onDone={setNotifyResults}
      />
    </div>
  );
}
