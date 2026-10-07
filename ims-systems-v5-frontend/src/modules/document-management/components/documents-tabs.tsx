import { cn } from "@/shared/lib/utils";
import type { DocumentsTabId } from "../types";

const TABS: Array<{ id: DocumentsTabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "repositories", label: "Repositories" },
  { id: "recycle", label: "Recycle Bin" },
];

type DocumentsTabsProps = {
  value: DocumentsTabId;
  onChange: (tab: DocumentsTabId) => void;
};

export function DocumentsTabs({ value, onChange }: DocumentsTabsProps) {
  return (
    <div
      className="flex flex-wrap gap-1 border-b border-border-subtle"
      role="tablist"
      aria-label="Documents views"
    >
      {TABS.map((tab) => {
        const selected = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={cn(
              "relative px-3.5 py-2.5 text-sm font-medium transition-colors",
              selected
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            {selected ? (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
