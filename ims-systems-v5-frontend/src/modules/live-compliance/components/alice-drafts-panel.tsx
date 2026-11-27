import { Sparkles } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useAliceDraftsQuery } from "../hooks/use-alice";
import { useAliceSheetStore } from "../lib/alice-store";

/** ALICE drafts waiting for a person to approve or discard. Hidden when none. */
export function AliceDraftsPanel() {
  const query = useAliceDraftsQuery("pending");
  const open = useAliceSheetStore((s) => s.open);
  const drafts = query.data ?? [];
  if (!drafts.length) return null;

  return (
    <section aria-labelledby="alice-drafts" className="rounded-xl border border-border-subtle bg-card p-4">
      <h2 id="alice-drafts" className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="size-4 text-primary" aria-hidden />
        ALICE drafts waiting for approval
        <span className="text-xs font-normal tabular-nums text-muted-foreground">{drafts.length}</span>
      </h2>
      <ul className="divide-y divide-border-subtle">
        {drafts.map((draft) => (
          <li key={draft.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{draft.applyLabel ?? draft.title}</p>
              <p className="text-xs text-muted-foreground">
                {draft.title} · {new Date(draft.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 shrink-0 rounded-full px-3 text-xs"
              onClick={() => open({ kind: "draft", draft })}
            >
              Review
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
