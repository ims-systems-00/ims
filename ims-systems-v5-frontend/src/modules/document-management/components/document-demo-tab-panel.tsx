import type { ReactNode } from "react";
import { EmptyState } from "@/shared/components/empty-state";

type DocumentDemoTabPanelProps = {
  title: string;
  description: string;
  icon?: ReactNode;
};

/**
 * Placeholder content for document tabs not yet backed by V5 APIs.
 */
export function DocumentDemoTabPanel({
  title,
  description,
  icon,
}: DocumentDemoTabPanelProps) {
  return (
    <div className="rounded-xl border border-border-subtle bg-card px-4 py-10">
      <EmptyState
        icon={icon}
        title={title}
        description={`${description} This tab is a demo placeholder — we will wire it up later.`}
      />
    </div>
  );
}
