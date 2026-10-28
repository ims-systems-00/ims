import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles, Trash2, WandSparkles } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime } from "@/shared/lib/format-date";
import { notify } from "@/shared/lib/toast";
import { TaskSheet, type TaskSheetMode } from "@/modules/tasks";
import type { TaskSource } from "@/modules/tasks/types";
import { UserAvatar } from "@/modules/users/components/user-avatar";
import { streamGptResponse } from "../api/ai";
import {
  useAiResponsesForSourceInfiniteQuery,
  useCreateAiResponseMutation,
  useDeleteAiResponseMutation,
} from "../hooks/use-ai";
import { compileAnalyserTemplate } from "../lib/compile-template";
import type {
  AiAnalyserTemplate,
  AiReportSection,
  AiResponse,
  AnalyticalAssistantContext,
} from "../types";
import { AliceMarkdown } from "./alice-markdown";

type PanelView = "home" | "conduct" | "saved";

type AnalyticalAssistantSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: AnalyticalAssistantContext | null;
};

function isReportReady(sections: AiReportSection[]): boolean {
  return (
    sections.length > 0 &&
    sections.every((section) => Boolean(section.response?.trim()))
  );
}

export function AnalyticalAssistantSheet({
  open,
  onOpenChange,
  context,
}: AnalyticalAssistantSheetProps) {
  const [view, setView] = useState<PanelView>("home");
  const [compiled, setCompiled] = useState<AiAnalyserTemplate | null>(null);
  const [report, setReport] = useState<AiReportSection[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(
    null
  );
  const [visiting, setVisiting] = useState<AiResponse | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskMode, setTaskMode] = useState<TaskSheetMode>("create");
  const [taskDescription, setTaskDescription] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const source = context?.source;
  const listQuery = useAiResponsesForSourceInfiniteQuery(
    source?.moduleType,
    source?.moduleId,
    open && Boolean(source)
  );
  const createMutation = useCreateAiResponseMutation();
  const deleteMutation = useDeleteAiResponseMutation();

  const saved = useMemo(
    () => listQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [listQuery.data?.pages]
  );

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
      setView("home");
      setCompiled(null);
      setReport([]);
      setStreaming(false);
      setActiveSectionIndex(null);
      setVisiting(null);
      setTaskOpen(false);
      setTaskDescription("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || !context) return;
    setCompiled(compileAnalyserTemplate(context.template, context.local));
  }, [open, context]);

  const createSource: TaskSource | undefined = useMemo(() => {
    if (!source) return undefined;
    return { moduleType: source.moduleType, moduleId: source.moduleId };
  }, [source]);

  function openConduct() {
    setVisiting(null);
    setReport([]);
    setView("conduct");
  }

  function clearAnalysis() {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setActiveSectionIndex(null);
    setReport([]);
  }

  async function startAnalysis() {
    if (!compiled) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const sections = compiled.reportStructure.map((section) => ({
      ...section,
      response: "",
    }));
    setReport(sections);
    setStreaming(true);

    try {
      for (let index = 0; index < sections.length; index += 1) {
        if (controller.signal.aborted) break;
        setActiveSectionIndex(index);
        const section = sections[index]!;
        const full = await streamGptResponse(
          {
            prompt: section.prompt,
            systemInstructions: [
              { role: "system", content: compiled.context },
            ],
            conversation: [],
          },
          {
            signal: controller.signal,
            onChunk: (chunk) => {
              setReport((prev) =>
                prev.map((item, i) =>
                  i === index
                    ? { ...item, response: `${item.response ?? ""}${chunk}` }
                    : item
                )
              );
            },
          }
        );
        setReport((prev) =>
          prev.map((item, i) =>
            i === index ? { ...item, response: full || item.response } : item
          )
        );
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        notify.fromError(error, "Unable to complete analysis");
      }
    } finally {
      setStreaming(false);
      setActiveSectionIndex(null);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  async function saveResponse() {
    if (!context || !compiled) return;
    if (!isReportReady(report)) {
      notify.error("Please wait until the report is ready.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        moduleType: context.source.moduleType,
        module: context.source.moduleId,
        template: {
          dataDisplay: compiled.dataDisplay,
          context: compiled.context,
          reportStructure: report,
        },
      });
      notify.success("Analysis saved.");
      clearAnalysis();
      setView("home");
    } catch (error) {
      notify.fromError(error, "Failed to save analysis");
    }
  }

  function openSaved(response: AiResponse) {
    setVisiting(response);
    setView("saved");
  }

  async function confirmDelete() {
    if (!visiting) return;
    try {
      await deleteMutation.mutateAsync(visiting.id);
      notify.success(
        `Analysis from ${formatDateTime(visiting.createdOn)} deleted.`
      );
      setDeleteOpen(false);
      setVisiting(null);
      setView("home");
    } catch (error) {
      notify.fromError(error, "Unable to delete analysis");
    }
  }

  function handleCreateTask(text: string) {
    if (!context?.canCreateTasks) {
      notify.error("Tasks cannot be created for this record right now.");
      return;
    }
    setTaskDescription(text);
    setTaskMode("create");
    setTaskOpen(true);
  }

  const title =
    view === "conduct"
      ? "Conduct analysis"
      : view === "saved"
        ? "Saved analysis"
        : "Analytical Assistant";

  const description =
    view === "home"
      ? "Alice · Beta"
      : view === "conduct"
        ? "Structured multi-section analysis"
        : visiting
          ? formatDateTime(visiting.createdOn)
          : undefined;

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        className="sm:max-w-xl"
        footer={
          view === "home" ? (
            <Button type="button" onClick={openConduct}>
              <WandSparkles className="size-4" />
              Conduct analysis
            </Button>
          ) : view === "conduct" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  clearAnalysis();
                  setView("home");
                }}
              >
                Back
              </Button>
              {report.length === 0 ? (
                <Button
                  type="button"
                  disabled={!compiled || streaming}
                  onClick={() => void startAnalysis()}
                >
                  <Sparkles className="size-4" />
                  Start analysis
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={streaming || createMutation.isPending}
                    onClick={clearAnalysis}
                  >
                    Clear all
                  </Button>
                  <Button
                    type="button"
                    disabled={
                      streaming ||
                      createMutation.isPending ||
                      !isReportReady(report)
                    }
                    onClick={() => void saveResponse()}
                  >
                    {createMutation.isPending ? "Saving…" : "Save response"}
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setVisiting(null);
                  setView("home");
                }}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                Delete analysis
              </Button>
            </>
          )
        }
      >
        {view === "home" ? (
          <HomePanel
            loading={listQuery.isLoading}
            items={saved}
            hasMore={Boolean(listQuery.hasNextPage)}
            loadingMore={listQuery.isFetchingNextPage}
            onLoadMore={() => void listQuery.fetchNextPage()}
            onConduct={openConduct}
            onOpen={openSaved}
          />
        ) : null}

        {view === "conduct" && compiled ? (
          <ConductPanel
            compiled={compiled}
            report={report}
            streaming={streaming}
            activeSectionIndex={activeSectionIndex}
            canCreateTasks={Boolean(context?.canCreateTasks)}
            onCreateTask={handleCreateTask}
          />
        ) : null}

        {view === "saved" && visiting ? (
          <SavedPanel
            response={visiting}
            canCreateTasks={Boolean(context?.canCreateTasks)}
            onCreateTask={handleCreateTask}
          />
        ) : null}
      </AppSheet>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this analysis?"
        description="This analysis will be deleted."
        confirmLabel="Delete analysis"
        pending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />

      <TaskSheet
        open={taskOpen}
        mode={taskMode}
        onOpenChange={setTaskOpen}
        onModeChange={setTaskMode}
        createSource={createSource}
        createBusinessUnitId={context?.businessUnitId}
        createDefaults={{ description: taskDescription }}
        onCreated={() => {
          notify.success("Task created from Alice suggestion");
          setTaskOpen(false);
        }}
      />
    </>
  );
}

function HomePanel({
  loading,
  items,
  hasMore,
  loadingMore,
  onLoadMore,
  onConduct,
  onOpen,
}: {
  loading: boolean;
  items: AiResponse[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onConduct: () => void;
  onOpen: (item: AiResponse) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading saved analyses…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-6" />
        </div>
        <h3 className="text-base font-semibold">Looks like this place is empty</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Revolutionise your analysis and decision-making with Alice.
        </p>
        <Button type="button" onClick={onConduct}>
          <WandSparkles className="size-4" />
          Conduct analysis
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Previous analyses for this record. Conduct a new one any time.
      </p>
      <ul className="space-y-2">
        {items.map((item) => {
          const conductor = item.createdBy?.name?.trim() || "Unknown analyst";
          return (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full items-start gap-3 rounded-lg border border-border-subtle px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                onClick={() => onOpen(item)}
              >
                <UserAvatar
                  name={conductor}
                  imageUrl={item.createdBy?.avatarUrl}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    Analysis conducted by {conductor}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatDateTime(item.createdOn)} ·{" "}
                    {item.template.reportStructure.length} sections
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {hasMore ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={loadingMore}
          onClick={onLoadMore}
        >
          {loadingMore ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </>
          ) : (
            "Load more"
          )}
        </Button>
      ) : null}
    </div>
  );
}

function ConductPanel({
  compiled,
  report,
  streaming,
  activeSectionIndex,
  canCreateTasks,
  onCreateTask,
}: {
  compiled: AiAnalyserTemplate;
  report: AiReportSection[];
  streaming: boolean;
  activeSectionIndex: number | null;
  canCreateTasks: boolean;
  onCreateTask: (text: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2">
        <AliceMarkdown>{compiled.dataDisplay}</AliceMarkdown>
        <span className="shrink-0 rounded-md border border-primary/30 px-2 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-primary">
          Beta
        </span>
      </div>

      {report.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Press <strong>Start analysis</strong> to generate each section with
          Alice.
        </p>
      ) : null}

      {report.map((section, index) => (
        <section key={`${section.name}-${index}`} className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{section.name}</h3>
            {streaming && activeSectionIndex === index ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Boosting now
              </span>
            ) : null}
          </div>
          {section.description ? (
            <p className="text-xs text-muted-foreground">{section.description}</p>
          ) : null}
          {section.response ? (
            <AliceMarkdown
              onCreateTaskFromListItem={
                canCreateTasks && !streaming ? onCreateTask : undefined
              }
            >
              {section.response}
            </AliceMarkdown>
          ) : streaming && activeSectionIndex === index ? (
            <p className="text-sm text-muted-foreground">Generating…</p>
          ) : null}
        </section>
      ))}
    </div>
  );
}

function SavedPanel({
  response,
  canCreateTasks,
  onCreateTask,
}: {
  response: AiResponse;
  canCreateTasks: boolean;
  onCreateTask: (text: string) => void;
}) {
  return (
    <div className="space-y-5">
      <AliceMarkdown>{response.template.dataDisplay}</AliceMarkdown>
      {response.template.reportStructure.map((section, index) => (
        <section key={`${section.name}-${index}`} className="space-y-2">
          <h3 className="text-sm font-semibold">{section.name}</h3>
          {section.description ? (
            <p className="text-xs text-muted-foreground">{section.description}</p>
          ) : null}
          {section.response ? (
            <AliceMarkdown
              onCreateTaskFromListItem={
                canCreateTasks ? onCreateTask : undefined
              }
            >
              {section.response}
            </AliceMarkdown>
          ) : null}
        </section>
      ))}
    </div>
  );
}
