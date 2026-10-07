import { cn } from "@/shared/lib/utils";

export type SheetPanelTab = {
  id: string;
  label: string;
};

type SheetPanelTabsProps = {
  tabs: SheetPanelTab[];
  value: string;
  onChange: (next: string) => void;
  className?: string;
  "aria-label"?: string;
};

/**
 * Compact tab strip for sliding sheets (Details / Activity / Interactions).
 */
export function SheetPanelTabs({
  tabs,
  value,
  onChange,
  className,
  "aria-label": ariaLabel = "Sheet sections",
}: SheetPanelTabsProps) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap gap-1 border-b border-border-subtle",
        className
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const selected = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={cn(
              "relative px-3 py-2 text-sm font-medium transition-colors",
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
