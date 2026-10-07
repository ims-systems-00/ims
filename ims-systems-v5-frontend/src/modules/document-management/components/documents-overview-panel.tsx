import {
  BookOpen,
  FileStack,
  FileText,
  Gavel,
  Loader2,
  Scale,
  Settings2,
  Shuffle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { useDocumentOverviewQuery } from "../hooks/use-document-management";
import {
  DOCUMENT_PURPOSE_LABELS,
  DOCUMENT_PURPOSES,
  type DocumentPurpose,
} from "../types";
import { useDocumentsUiStore } from "../store/use-documents-ui-store";

const PURPOSE_META: Record<
  DocumentPurpose,
  { icon: LucideIcon; accent: string; soft: string }
> = {
  Process: {
    icon: Settings2,
    accent: "text-sky-700 dark:text-sky-300",
    soft: "bg-sky-500/10",
  },
  "Standard operating procedure": {
    icon: BookOpen,
    accent: "text-violet-700 dark:text-violet-300",
    soft: "bg-violet-500/10",
  },
  Policy: {
    icon: Scale,
    accent: "text-emerald-700 dark:text-emerald-300",
    soft: "bg-emerald-500/10",
  },
  Document: {
    icon: FileText,
    accent: "text-amber-700 dark:text-amber-300",
    soft: "bg-amber-500/10",
  },
  Legal: {
    icon: Gavel,
    accent: "text-rose-700 dark:text-rose-300",
    soft: "bg-rose-500/10",
  },
  Miscellaneous: {
    icon: Shuffle,
    accent: "text-slate-700 dark:text-slate-300",
    soft: "bg-slate-500/10",
  },
};

export function DocumentsOverviewPanel() {
  const overviewQuery = useDocumentOverviewQuery();
  const setTab = useDocumentsUiStore((state) => state.setTab);

  if (overviewQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading overview…
      </div>
    );
  }

  if (overviewQuery.isError) {
    return (
      <EmptyState
        title="Unable to load overview"
        description="Published document counts could not be loaded."
      />
    );
  }

  const data = overviewQuery.data!;
  const maxPurpose = Math.max(
    1,
    ...DOCUMENT_PURPOSES.map((purpose) => data.byPurpose[purpose] ?? 0)
  );

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-xl border border-border-subtle bg-gradient-to-br from-primary/[0.07] via-surface to-surface px-5 py-5 sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 size-44 rounded-full bg-info/10 blur-3xl" />

        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle/80 bg-surface/80 px-2.5 py-1 text-[0.6875rem] font-medium text-muted-foreground backdrop-blur">
              <FileStack className="size-3.5 text-primary" />
              Controlled library
            </div>
            <div>
              <p className="text-[0.75rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Published documents
              </p>
              <p className="mt-1 text-4xl font-semibold tracking-tight text-foreground tabular-nums">
                {data.total}
              </p>
            </div>
            <p className="max-w-xl text-[0.8125rem] leading-relaxed text-muted-foreground">
              Organisation-wide published files by purpose. Open repositories to
              manage folders, versions, and authorisation.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setTab("repositories")}
          >
            Browse repositories
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              By purpose
            </h2>
            <p className="text-[0.75rem] text-muted-foreground">
              Click a card to jump into repositories.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {DOCUMENT_PURPOSES.map((purpose) => {
            const count = data.byPurpose[purpose] ?? 0;
            const meta = PURPOSE_META[purpose];
            const Icon = meta.icon;
            const ratio = Math.round((count / maxPurpose) * 100);

            return (
              <button
                key={purpose}
                type="button"
                onClick={() => setTab("repositories")}
                className={cn(
                  "group relative overflow-hidden rounded-xl border border-border-subtle bg-card p-4 text-left",
                  "transition-[border-color,box-shadow,transform] duration-150",
                  "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg",
                      meta.soft,
                      meta.accent
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <span className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                    {count}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    {DOCUMENT_PURPOSE_LABELS[purpose]}
                  </p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-[width] duration-300 group-hover:bg-primary"
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                  <p className="text-[0.6875rem] text-muted-foreground">
                    {data.total > 0
                      ? `${Math.round((count / data.total) * 100)}% of published set`
                      : "No published documents yet"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
