import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/shared/layout";
import { loadPublicEnv } from "@/shared/lib/env";
import {
  permissionAllowed,
  useSecurityCapabilitiesQuery,
} from "@/modules/security/hooks/use-security-capabilities";
import { cn } from "@/shared/lib/utils";
import { TenderAuditPanel } from "../components/tender-audit-panel";
import { TenderAuditorPanel } from "../components/tender-auditor-panel";
import { TenderEvidencePanel } from "../components/tender-evidence-panel";
import { TenderFactsPanel } from "../components/tender-facts-panel";
import { TenderImportDialog } from "../components/tender-import-dialog";
import { TenderInboxPanel } from "../components/tender-inbox-panel";
import { TenderLibraryPanel } from "../components/tender-library-panel";
import { TenderQuestionnaireSheet } from "../components/tender-questionnaire-sheet";
import { TenderSettingsPanel } from "../components/tender-settings-panel";
import { TENDER_VIEW_LABELS } from "../lib/tender-display";
import {
  TENDER_BID_TABS,
  TENDER_HUB_VIEWS,
  type TenderBidTab,
  type TenderHubView,
} from "../types";

function parseView(value: string | null): TenderHubView {
  if (value && (TENDER_HUB_VIEWS as readonly string[]).includes(value)) {
    return value as TenderHubView;
  }
  return "inbox";
}

function parseBidTab(value: string | null): TenderBidTab {
  if (value && (TENDER_BID_TABS as readonly string[]).includes(value)) {
    return value as TenderBidTab;
  }
  return "overview";
}

/**
 * Tender Autopilot hub at `/tender`.
 */
export function TenderHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = parseView(searchParams.get("view"));
  const questionnaireId = searchParams.get("q");
  const bidTab = parseBidTab(searchParams.get("tab"));
  const [importOpen, setImportOpen] = useState(false);

  const capsQuery = useSecurityCapabilitiesQuery();
  const provider = loadPublicEnv().VITE_SECURITY_PROVIDER;
  const canRead = permissionAllowed(
    "tender:read",
    capsQuery.data?.permissions,
    provider
  );
  const canCreate = permissionAllowed(
    "tender:create",
    capsQuery.data?.permissions,
    provider
  );

  const paramsBase = useMemo(() => {
    return new URLSearchParams(searchParams);
  }, [searchParams]);

  function setView(next: TenderHubView) {
    const params = new URLSearchParams(paramsBase);
    params.set("view", next);
    params.delete("q");
    params.delete("tab");
    setSearchParams(params);
  }

  function openQuestionnaire(id: string, tab: TenderBidTab = "overview") {
    const params = new URLSearchParams(paramsBase);
    if (view === "settings" || view === "auditor") {
      params.set("view", "inbox");
    }
    params.set("q", id);
    params.set("tab", tab);
    setSearchParams(params);
  }

  function closeSheet() {
    const params = new URLSearchParams(paramsBase);
    params.delete("q");
    params.delete("tab");
    setSearchParams(params);
  }

  function setBidTab(tab: TenderBidTab) {
    const params = new URLSearchParams(paramsBase);
    params.set("tab", tab);
    setSearchParams(params);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tender Autopilot"
        description="Import questionnaires, draft answers from the library, price, gate and submit with auditor evidence."
      />

      <div
        className="flex flex-wrap gap-1 border-b border-border-subtle"
        role="tablist"
        aria-label="Tender views"
      >
        {TENDER_HUB_VIEWS.map((id) => {
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
              {TENDER_VIEW_LABELS[id]}
              {selected ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </button>
          );
        })}
      </div>

      {!canRead ? (
        <p className="text-sm text-muted-foreground">
          You do not have permission to view Tender Autopilot.
        </p>
      ) : (
        <>
          {view === "inbox" ? (
            <TenderInboxPanel
              onOpenQuestionnaire={(id) => openQuestionnaire(id)}
              onImport={() => setImportOpen(true)}
              canCreate={canCreate}
            />
          ) : null}
          {view === "library" ? (
            <TenderLibraryPanel canEdit={canCreate} />
          ) : null}
          {view === "evidence" ? (
            <TenderEvidencePanel canEdit={canCreate} />
          ) : null}
          {view === "facts" ? <TenderFactsPanel canEdit={canCreate} /> : null}
          {view === "audit" ? <TenderAuditPanel /> : null}
          {view === "settings" ? (
            <TenderSettingsPanel canEdit={canCreate} />
          ) : null}
          {view === "auditor" ? <TenderAuditorPanel /> : null}
        </>
      )}

      <TenderImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onCreated={(id) => openQuestionnaire(id, "questions")}
      />

      <TenderQuestionnaireSheet
        open={Boolean(questionnaireId)}
        questionnaireId={questionnaireId}
        initialTab={bidTab}
        onOpenChange={(next) => {
          if (!next) closeSheet();
        }}
        onTabChange={setBidTab}
        canEdit={canCreate}
      />
    </div>
  );
}
