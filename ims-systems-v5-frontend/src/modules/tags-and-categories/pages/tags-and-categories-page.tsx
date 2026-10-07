import { PageHeader } from "@/shared/layout";
import { TagsManagementPanel } from "../components/tags-management-panel";

/**
 * Standalone Tags / Categories catalogue (Reviews navigation).
 */
export function TagsAndCategoriesPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories"
        description="Organisation classification labels used across Risks, Incidents, Inventory, and CRM. One optional category per record."
      />
      <TagsManagementPanel
        title="All categories"
        description="Create labels and choose which modules may use them. Module screens also offer a Categories tab for the same catalogue, filtered to that module."
      />
    </div>
  );
}
