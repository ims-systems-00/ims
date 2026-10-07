import { cn } from "@/shared/lib/utils";

type ModuleViewTabsProps = {
  recordsLabel: string;
  categoriesLabel: string;
  value: "records" | "categories";
  onChange: (next: "records" | "categories") => void;
};

/**
 * Records vs Categories switch used on linked operational module pages.
 */
export function ModuleViewTabs({
  recordsLabel,
  categoriesLabel,
  value,
  onChange,
}: ModuleViewTabsProps) {
  const tabs = [
    { id: "records" as const, label: recordsLabel },
    { id: "categories" as const, label: categoriesLabel },
  ];

  return (
    <div
      className="flex flex-wrap gap-1 border-b border-border-subtle"
      role="tablist"
      aria-label="Module views"
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
