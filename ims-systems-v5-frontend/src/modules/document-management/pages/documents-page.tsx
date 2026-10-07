import { PageHeader } from "@/shared/layout";
import { DocumentsOverviewPanel } from "../components/documents-overview-panel";
import { DocumentsTabs } from "../components/documents-tabs";
import { RepositoriesPanel } from "../components/repositories-panel";
import { useDocumentsUiStore } from "../store/use-documents-ui-store";

/**
 * Documents list — Overview / Repositories / Recycle Bin.
 * Spec: docs/module-specifications/document-management.md
 */
export function DocumentsPage() {
  const tab = useDocumentsUiStore((state) => state.tab);
  const setTab = useDocumentsUiStore((state) => state.setTab);

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
