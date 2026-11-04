import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  History,
  Loader2,
  Pin,
  PinOff,
  Plus,
  SendHorizontal,
  Square,
  Trash2,
} from "lucide-react";
import aliceHorizontal from "@/assets/images/Type=Horizontal.png";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/lib/utils";
import { notify } from "@/shared/lib/toast";
import { TaskSheet, type TaskSheetMode } from "@/modules/tasks";
import {
  useAiChatThreadsQuery,
  useDeleteAiChatThreadMutation,
} from "../hooks/use-ai";
import { useAliceChatSession } from "../hooks/use-alice-chat-session";
import {
  buildPageContext,
  pageContextLabel,
  suggestedPromptsForModule,
} from "../lib/page-context";
import { useAliceChatStore } from "../store/use-alice-chat-store";
import type { AiChatProposal } from "../types-chat";
import { AliceCitationChip } from "./alice-citation-chip";
import { AliceMarkdown } from "./alice-markdown";
import { AliceProposalCard } from "./alice-proposal-card";

function mapTaskModule(module: string): string {
  if (module === "ofi") return "cips";
  if (module === "documents") return "documenttrees";
  return module;
}

/**
 * Right-side page-tailored Alice sidebar (navbar entry).
 */
export function AliceChatSheet() {
  const location = useLocation();
  const navigate = useNavigate();
  const surface = useAliceChatStore((s) => s.surface);
  const open = surface === "sidebar";
  const closeChat = useAliceChatStore((s) => s.closeChat);
  const threadId = useAliceChatStore((s) => s.threadId);
  const messages = useAliceChatStore((s) => s.messages);
  const pinnedRecords = useAliceChatStore((s) => s.pinnedRecords);
  const streaming = useAliceChatStore((s) => s.streaming);
  const pendingCitations = useAliceChatStore((s) => s.pendingCitations);
  const pendingProposals = useAliceChatStore((s) => s.pendingProposals);
  const error = useAliceChatStore((s) => s.error);
  const historyOpen = useAliceChatStore((s) => s.historyOpen);
  const setHistoryOpen = useAliceChatStore((s) => s.setHistoryOpen);
  const setThreadId = useAliceChatStore((s) => s.setThreadId);
  const setMessages = useAliceChatStore((s) => s.setMessages);
  const pinRecord = useAliceChatStore((s) => s.pinRecord);
  const unpinRecord = useAliceChatStore((s) => s.unpinRecord);
  const dismissProposal = useAliceChatStore((s) => s.dismissProposal);
  const resetConversation = useAliceChatStore((s) => s.resetConversation);

  const { sendMessage, stopStreaming } = useAliceChatSession("page");

  const [draft, setDraft] = useState("");
  const [pendingDeleteThreadId, setPendingDeleteThreadId] = useState<
    string | null
  >(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskMode, setTaskMode] = useState<TaskSheetMode>("create");
  const [taskSeed, setTaskSeed] = useState<{
    name?: string;
    description?: string;
  }>({});
  const [pendingTaskText, setPendingTaskText] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const pageContext = useMemo(
    () => buildPageContext(location.pathname, location.search),
    [location.pathname, location.search]
  );
  const suggestions = useMemo(
    () => suggestedPromptsForModule(pageContext.moduleHint),
    [pageContext.moduleHint]
  );
  const contextLabel = useMemo(
    () => pageContextLabel(pageContext),
    [pageContext]
  );

  const threadsQuery = useAiChatThreadsQuery(open && historyOpen);
  const deleteThreadMutation = useDeleteAiChatThreadMutation();

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open, pendingProposals]);

  function handlePinCurrentPage() {
    const selected = pageContext.selectedIds?.[0];
    if (!selected) {
      notify.error("Open a specific record first, then pin it.");
      return;
    }
    pinRecord({
      module: selected.module,
      id: selected.id,
      label: `${selected.module} ${selected.id.slice(0, 8)}`,
    });
    notify.success("Record pinned for this chat");
  }

  function confirmProposal(proposal: AiChatProposal, index: number) {
    if (proposal.action === "create_task") {
      const notes = proposal.payload.notes
        ? String(proposal.payload.notes)
        : "";
      const priority = proposal.payload.priority
        ? `Priority: ${String(proposal.payload.priority)}`
        : "";
      setTaskSeed({
        name: String(proposal.payload.name ?? ""),
        description: [notes, priority].filter(Boolean).join("\n"),
      });
      setTaskMode("create");
      setTaskOpen(true);
      dismissProposal(index);
      return;
    }
    const params = new URLSearchParams({
      create: "1",
      title: String(proposal.payload.title ?? "").slice(0, 200),
      description: String(proposal.payload.description ?? "").slice(0, 1500),
    });
    dismissProposal(index);
    closeChat();
    navigate(`/ofi?${params.toString()}`);
  }

  async function loadThread(id: string) {
    try {
      const { getAiChatThread } = await import("../api/ai");
      const thread = await getAiChatThread(id);
      setThreadId(thread.id);
      setMessages(
        thread.messages.map((row) => ({
          id: row.id,
          role: row.role,
          content: row.content,
          citations: row.citations,
        }))
      );
      setHistoryOpen(false);
    } catch (err) {
      notify.fromError(err, "Unable to load chat");
    }
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) closeChat();
        }}
      >
        <SheetContent
          side="right"
          showClose
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="space-y-2 border-b border-border-subtle/80 px-4 py-3 text-left">
            <div className="flex items-start justify-between gap-2 pr-6">
              <div className="min-w-0">
                <SheetTitle className="sr-only">Alice on this page</SheetTitle>
                <img
                  src={aliceHorizontal}
                  alt="Alice"
                  className="h-7 w-auto max-w-[9.5rem] object-contain object-left"
                />
                <SheetDescription className="mt-1 text-xs">
                  Page-tailored assistant
                </SheetDescription>
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Chat history"
                  onClick={() => setHistoryOpen(!historyOpen)}
                >
                  <History className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="New chat"
                  onClick={() => resetConversation()}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[0.7rem] font-medium text-primary">
                {contextLabel}
              </span>
              <button
                type="button"
                className="inline-flex h-7 items-center gap-1 rounded-full border border-border-subtle/90 bg-muted/20 px-2.5 text-[0.68rem] font-medium text-muted-foreground transition hover:border-primary/20 hover:bg-primary/[0.06] hover:text-foreground"
                onClick={() => handlePinCurrentPage()}
              >
                <Pin className="size-3" />
                Pin page record
              </button>
              <button
                type="button"
                className="inline-flex h-7 items-center gap-1 rounded-full border border-border-subtle/90 bg-muted/20 px-2.5 text-[0.68rem] font-medium text-muted-foreground transition hover:border-primary/20 hover:bg-primary/[0.06] hover:text-foreground"
                onClick={() =>
                  void sendMessage("Summarise this page for me", pageContext)
                }
              >
                Summarise this page
              </button>
              <button
                type="button"
                className="inline-flex h-7 items-center gap-1 rounded-full border border-border-subtle/90 bg-muted/20 px-2.5 text-[0.68rem] font-medium text-muted-foreground transition hover:border-primary/20 hover:bg-primary/[0.06] hover:text-foreground"
                onClick={() =>
                  void sendMessage(
                    "Propose a follow-up task for the record or work on this page",
                    pageContext
                  )
                }
              >
                New task from this page
              </button>
            </div>
            {pinnedRecords.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {pinnedRecords.map((pin) => (
                  <span
                    key={`${pin.module}:${pin.id}`}
                    className="inline-flex max-w-[10rem] items-center gap-1 rounded-full bg-muted/40 px-2 py-1 text-[0.65rem]"
                  >
                    <span className="truncate">
                      {pin.label ?? `${pin.module}:${pin.id.slice(0, 6)}`}
                    </span>
                    <button
                      type="button"
                      aria-label="Unpin"
                      onClick={() => unpinRecord(pin.module, pin.id)}
                    >
                      <PinOff className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </SheetHeader>

          {historyOpen ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {threadsQuery.isLoading ? (
                <p className="ims-text-meta flex items-center justify-center gap-2 py-6">
                  <Loader2 className="size-3.5 animate-spin" /> Loading…
                </p>
              ) : (threadsQuery.data ?? []).length === 0 ? (
                <p className="ims-text-meta py-6 text-center">
                  No saved chats yet.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {(threadsQuery.data ?? []).map((thread) => (
                    <li
                      key={thread.id}
                      className="flex items-center gap-1 rounded-xl border border-border-subtle/80 bg-muted/20 px-2.5 py-2"
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left text-sm hover:text-primary"
                        onClick={() => void loadThread(thread.id)}
                      >
                        {thread.title}
                      </button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Delete chat"
                        onClick={() => setPendingDeleteThreadId(thread.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              <div
                ref={listRef}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3"
              >
                {messages.length === 0 ? (
                  <div className="space-y-4 py-1">
                    <div className="rounded-2xl bg-gradient-to-br from-primary/[0.1] via-transparent to-transparent px-3.5 py-3.5">
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Alice is focused on{" "}
                        <span className="font-medium text-foreground">
                          {contextLabel.toLowerCase()}
                        </span>
                        . Ask about this page, pin the open record, or create a
                        follow-up task.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {suggestions.map((prompt, index) => (
                        <button
                          key={prompt}
                          type="button"
                          className="rounded-xl border border-border-subtle/90 bg-muted/15 px-3 py-2.5 text-left text-xs leading-snug text-foreground/90 transition hover:border-primary/25 hover:bg-primary/[0.06]"
                          style={{
                            animation: `ims-alice-panel-in 320ms cubic-bezier(0.16, 1, 0.3, 1) ${index * 40}ms both`,
                          }}
                          onClick={() => void sendMessage(prompt, pageContext)}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {messages.map((message, index) => {
                  const isLast = index === messages.length - 1;
                  const showThinking =
                    message.role === "assistant" &&
                    !message.content &&
                    streaming &&
                    isLast;
                  const proposals =
                    isLast && message.role === "assistant"
                      ? message.proposals?.length
                        ? message.proposals
                        : pendingProposals
                      : message.proposals;
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "max-w-full min-w-0 overflow-hidden rounded-2xl px-3 py-2.5 text-sm",
                        message.role === "user"
                          ? "ml-6 bg-primary text-primary-foreground shadow-sm"
                          : "mr-1 bg-muted/45 ring-1 ring-border-subtle/70"
                      )}
                    >
                      {message.role === "assistant" ? (
                        showThinking ? (
                          <p className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="size-3.5 animate-spin" />
                            Thinking…
                          </p>
                        ) : (
                          <AliceMarkdown
                            onCreateTaskFromListItem={(text) =>
                              setPendingTaskText(text)
                            }
                          >
                            {message.content}
                          </AliceMarkdown>
                        )
                      ) : (
                        <p className="whitespace-pre-wrap break-words text-[0.8125rem] leading-relaxed">
                          {message.content}
                        </p>
                      )}
                      {message.role === "assistant" &&
                      (message.citations?.length ?? 0) > 0 ? (
                        <div className="mt-2.5 flex max-w-full flex-wrap gap-1.5">
                          {message.citations!.map((cite) => (
                            <AliceCitationChip
                              key={`${cite.module}:${cite.id}`}
                              cite={cite}
                              onPin={(c) =>
                                pinRecord({
                                  module: c.module,
                                  id: c.id,
                                  label: c.reference ?? c.title,
                                  href: c.href,
                                })
                              }
                            />
                          ))}
                        </div>
                      ) : null}
                      {message.role === "assistant" && proposals?.length
                        ? proposals.map((proposal, pIndex) => (
                            <AliceProposalCard
                              key={`${proposal.action}-${pIndex}`}
                              proposal={proposal}
                              onConfirm={() =>
                                confirmProposal(proposal, pIndex)
                              }
                              onDismiss={() => dismissProposal(pIndex)}
                            />
                          ))
                        : null}
                    </div>
                  );
                })}

                {streaming &&
                pendingCitations.length > 0 &&
                !messages.at(-1)?.citations?.length ? (
                  <div className="flex max-w-full flex-wrap gap-1.5 px-1">
                    {pendingCitations.map((cite) => (
                      <AliceCitationChip
                        key={`${cite.module}:${cite.id}`}
                        cite={cite}
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              {error ? (
                <p
                  className="shrink-0 px-4 pb-1 text-xs text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              <form
                className="flex shrink-0 items-end gap-2 border-t border-border-subtle/80 bg-muted/10 p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const text = draft;
                  setDraft("");
                  void sendMessage(text, pageContext);
                }}
              >
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={`Ask Alice about ${contextLabel.toLowerCase()}…`}
                  rows={2}
                  className="min-h-[2.75rem] max-h-28 resize-none rounded-xl border-border-subtle bg-surface text-sm shadow-none focus-visible:ring-primary/30"
                  disabled={streaming}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      const text = draft;
                      setDraft("");
                      void sendMessage(text, pageContext);
                    }
                  }}
                />
                {streaming ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="size-10 shrink-0 rounded-xl"
                    aria-label="Stop"
                    onClick={() => stopStreaming()}
                  >
                    <Square className="size-3.5 fill-current" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    className="size-10 shrink-0 rounded-xl"
                    disabled={!draft.trim()}
                    aria-label="Send"
                  >
                    <SendHorizontal className="size-4" />
                  </Button>
                )}
              </form>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(pendingDeleteThreadId)}
        onOpenChange={(next) => {
          if (!next) setPendingDeleteThreadId(null);
        }}
        title="Delete chat?"
        description="This removes the saved Alice conversation."
        confirmLabel="Delete"
        pending={deleteThreadMutation.isPending}
        onConfirm={async () => {
          if (!pendingDeleteThreadId) return;
          try {
            await deleteThreadMutation.mutateAsync(pendingDeleteThreadId);
            if (threadId === pendingDeleteThreadId) resetConversation();
            setPendingDeleteThreadId(null);
            notify.success("Chat deleted");
          } catch (err) {
            notify.fromError(err, "Unable to delete chat");
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingTaskText)}
        onOpenChange={(next) => {
          if (!next) setPendingTaskText(null);
        }}
        title="Create task from Alice?"
        description="Opens the task form pre-filled with Alice's suggestion."
        confirmLabel="Open task form"
        destructive={false}
        onConfirm={() => {
          if (!pendingTaskText) return;
          setTaskSeed({ description: pendingTaskText });
          setPendingTaskText(null);
          setTaskMode("create");
          setTaskOpen(true);
        }}
      />

      <TaskSheet
        open={taskOpen}
        mode={taskMode}
        taskId={undefined}
        onOpenChange={setTaskOpen}
        onModeChange={setTaskMode}
        createSource={
          pageContext.selectedIds?.[0]
            ? {
                moduleType: mapTaskModule(pageContext.selectedIds[0].module),
                moduleId: pageContext.selectedIds[0].id,
              }
            : undefined
        }
        createDefaults={{
          name: taskSeed.name,
          description: taskSeed.description,
        }}
      />
    </>
  );
}
