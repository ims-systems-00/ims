import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/shared/layout";
import { DocumentsOverviewPanel } from "../components/documents-overview-panel";
import { DocumentsTabs } from "../components/documents-tabs";
import { RepositoriesPanel } from "../components/repositories-panel";
import { useDocumentsUiStore } from "../store/use-documents-ui-store";
import type { DocumentsTabId } from "../types";

const TAB_IDS = new Set<DocumentsTabId>([
  "overview",
  "repositories",
  "recycle",
]);

/**
 * Documents list — Overview / Repositories / Recycle Bin.
 * Spec: docs/module-specifications/document-management.md
 *
 * Setup Guide deep-links: `?tab=repositories&createRepo=1`.
 */
export function DocumentsPage() {
  const [searchParams] = useSearchParams();
  const tab = useDocumentsUiStore((state) => state.tab);
  const setTab = useDocumentsUiStore((state) => state.setTab);
  const setCreateRepoOpen = useDocumentsUiStore((s) => s.setCreateRepoOpen);

  useEffect(() => {
    const nextTab = searchParams.get("tab");
    if (nextTab && TAB_IDS.has(nextTab as DocumentsTabId)) {
      setTab(nextTab as DocumentsTabId);
    }
    if (searchParams.get("createRepo") === "1") {
      setTab("repositories");
      setCreateRepoOpen(true);
    }
  }, [searchParams, setCreateRepoOpen, setTab]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Documents"
        description="Controlled document libraries with repositories, folders, versions, and authorisation."
      />
      <DocumentsTabs value={tab} onChange={setTab} />
      {tab === "overview" ? <DocumentsOverviewPanel /> : null}
      {tab === "repositories" ? <RepositoriesPanel /> : null}
      {tab === "recycle" ? <RepositoriesPanel deleted /> : null}
    </div>
  );
}
