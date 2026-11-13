import { CircleHelp } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { SETUP_STEPS } from "../catalog";
import { completedCount, useSetupGuideStore } from "../store";

/**
 * Compact sidebar control when the setup popup was dismissed with “Hide for now”.
 */
export function SetupSidebarEntry({ collapsed }: { collapsed: boolean }) {
  const hidden = useSetupGuideStore((s) => s.checklistHidden);
  const checklistOpen = useSetupGuideStore((s) => s.checklistOpen);
  const completedSteps = useSetupGuideStore((s) => s.completedSteps);
  const openChecklist = useSetupGuideStore((s) => s.openChecklist);
  const done = completedCount(completedSteps);
  const total = SETUP_STEPS.length;

  // Show while the checklist was hidden so users can reopen it.
  if (!hidden || checklistOpen) return null;

  return (
    <button
      type="button"
      onClick={() => {
        openChecklist();
      }}
      className={cn(
        "mx-2 mb-2 flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-[0.8125rem] font-medium text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-0"
      )}
      title={`Get set up ${done}/${total}`}
      aria-label={`Get set up ${done} of ${total}`}
    >
      <CircleHelp className="size-4 shrink-0" aria-hidden />
      {collapsed ? null : (
        <span className="truncate">
          Get set up {done}/{total}
        </span>
      )}
    </button>
  );
}
