import {
  BookOpen,
  Boxes,
  ClipboardCheck,
  FileStack,
  FileText,
  Gavel,
  GraduationCap,
  Handshake,
  Loader2,
  Pin,
  PinOff,
  Scale,
  Settings2,
  Shuffle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { getActiveOrganisationId } from "@/shared/lib/active-organisation";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { useDocumentOverviewQuery } from "../hooks/use-document-management";
import { usePinnedFoldersStore } from "../store/use-pinned-folders-store";
import {
  DOCUMENT_PURPOSE_LABELS,
  DOCUMENT_PURPOSES,
  DOCUMENT_SOURCE_MODULES,
  DOCUMENT_SOURCE_MODULE_DESCRIPTIONS,
  DOCUMENT_SOURCE_MODULE_LABELS,
  type DocumentPurpose,
  type DocumentSourceModule,
} from "../types";
import { useDocumentsUiStore } from "../store/use-documents-ui-store";
import { FileTypeIcon } from "./file-type-icon";

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

const SOURCE_MODULE_META: Record<
  DocumentSourceModule,
  { icon: LucideIcon; accent: string; soft: string }
> = {
  training: {
    icon: GraduationCap,
    accent: "text-indigo-700 dark:text-indigo-300",
    soft: "bg-indigo-500/10",
  },
  inventory: {
    icon: Boxes,
    accent: "text-teal-700 dark:text-teal-300",
    soft: "bg-teal-500/10",
  },
  supplier: {
    icon: Handshake,
    accent: "text-orange-700 dark:text-orange-300",
    soft: "bg-orange-500/10",
  },
  tender: {
    icon: ClipboardCheck,
    accent: "text-cyan-700 dark:text-cyan-300",
    soft: "bg-cyan-500/10",
  },
};

const EMPTY_PINNED: never[] = [];

export function DocumentsOverviewPanel() {
  const overviewQuery = useDocumentOverviewQuery();
  const setTab = useDocumentsUiStore((state) => state.setTab);
  const navigate = useNavigate();
  const orgId = getActiveOrganisationId() ?? "default";
  const pinnedFolders = usePinnedFoldersStore(
    (state) => state.byOrg[orgId] ?? EMPTY_PINNED
  );
  const unpinFolder = usePinnedFoldersStore((state) => state.unpinFolder);

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
  const bySourceModule = data.bySourceModule ?? {
    training: 0,
    inventory: 0,
    supplier: 0,
    tender: 0,
  };
  const maxPurpose = Math.max(
    1,
    ...DOCUMENT_PURPOSES.map((purpose) => data.byPurpose[purpose] ?? 0)
  );
  const maxSource = Math.max(
    1,
    ...DOCUMENT_SOURCE_MODULES.map((module) => bySourceModule[module] ?? 0)
  );
  const moduleTotal = DOCUMENT_SOURCE_MODULES.reduce(
    (sum, module) => sum + (bySourceModule[module] ?? 0),
    0
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
              Organisation-wide published files by purpose, plus evidence and
              certificates uploaded from Training, Inventory, Supplier and
              Tender — each opens as a controlled document.
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
              From modules
            </h2>
            <p className="text-[0.75rem] text-muted-foreground">
              Evidence, certificates and library files uploaded in operational
              modules
              {moduleTotal > 0 ? ` · ${moduleTotal} total` : ""}.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {DOCUMENT_SOURCE_MODULES.map((module) => {
            const count = bySourceModule[module] ?? 0;
            const meta = SOURCE_MODULE_META[module];
            const Icon = meta.icon;
            const ratio = Math.round((count / maxSource) * 100);

            return (
              <button
                key={module}
                type="button"
                onClick={() => navigate(`/documents/modules/${module}`)}
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
                    {DOCUMENT_SOURCE_MODULE_LABELS[module]}
                  </p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-[width] duration-300 group-hover:bg-primary"
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                  <p className="text-[0.6875rem] text-muted-foreground">
                    {DOCUMENT_SOURCE_MODULE_DESCRIPTIONS[module]}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              By purpose
            </h2>
            <p className="text-[0.75rem] text-muted-foreground">
              Click a card to see published documents with that purpose.
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
                onClick={() =>
                  navigate(`/documents/overview/${encodeURIComponent(purpose)}`)
                }
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

        {pinnedFolders.length > 0 ? (
          <div className="space-y-3 pt-2">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-tight text-foreground">
                  <Pin className="size-3.5 text-primary" aria-hidden />
                  Pinned folders
                </h3>
                {/* <p className="text-[0.75rem] text-muted-foreground">
                  {pinnedFolders.length} of {MAX_PINNED_FOLDERS} pins used.
                  Open a folder from any repository to pin more.
                </p> */}
              </div>
            </div>

            <div
              className="min-h-[8rem] rounded-xl border border-border-subtle bg-muted/15 p-3 sm:p-4"
              role="list"
              aria-label="Pinned folders"
            >
              <div className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-x-2 gap-y-3 sm:grid-cols-[repeat(auto-fill,minmax(7rem,1fr))]">
                {pinnedFolders.map((folder) => (
                  <div
                    key={`${folder.repositoryId}:${folder.folderId}`}
                    role="listitem"
                    className="group relative flex flex-col items-center gap-2 rounded-lg px-2 py-3 text-center transition-colors hover:bg-primary/10"
                  >
                    <button
                      type="button"
                      title={`Unpin ${folder.name}`}
                      aria-label={`Unpin ${folder.name}`}
                      className="absolute right-1.5 top-1.5 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        unpinFolder(folder.repositoryId, folder.folderId);
                        notify.success("Folder unpinned");
                      }}
                    >
                      <PinOff className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      title={`${folder.name} · ${folder.repositoryName}`}
                      className="flex w-full flex-col items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      onClick={() =>
                        navigate(
                          `/documents/repositories/${folder.repositoryId}?folder=${encodeURIComponent(folder.folderId)}`
                        )
                      }
                    >
                      <div className="relative flex size-16 items-center justify-center sm:size-[4.5rem]">
                        <FileTypeIcon
                          type="folder"
                          size="lg"
                          className="drop-shadow-sm"
                        />
                        <span className="absolute -right-0.5 -top-0.5 rounded-full bg-primary p-0.5 text-primary-foreground shadow-sm">
                          <Pin className="size-2.5" aria-hidden />
                        </span>
                      </div>
                      <span className="line-clamp-2 w-full break-words px-0.5 text-[0.75rem] leading-snug font-medium text-foreground">
                        {folder.name}
                      </span>
                      <span className="line-clamp-1 w-full px-0.5 text-[0.625rem] text-muted-foreground">
                        {folder.repositoryName}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
