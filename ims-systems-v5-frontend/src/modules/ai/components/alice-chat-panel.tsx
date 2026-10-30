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
  X,
} from "lucide-react";
import aliceHorizontal from "@/assets/images/Type=Horizontal.png";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
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
  suggestedPromptsGeneral,
} from "../lib/page-context";
import { useAliceChatStore } from "../store/use-alice-chat-store";
import type { AiChatProposal } from "../types-chat";
import { AliceCitationChip } from "./alice-citation-chip";
import { AliceMarkdown } from "./alice-markdown";
import { AliceProposalCard } from "./alice-proposal-card";

/**
 * Floating general-purpose Alice chat (org-wide).
 */
export function AliceChatPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const surface = useAliceChatStore((s) => s.surface);
  const open = surface === "float";
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

  const { sendMessage, stopStreaming } = useAliceChatSession("general");

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
  const [rendered, setRendered] = useState(open);
  const [entered, setEntered] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const pageContext = useMemo(
    () => buildPageContext(location.pathname, location.search),
    [location.pathname, location.search]
  );
  const suggestions = useMemo(() => suggestedPromptsGeneral(), []);

  const threadsQuery = useAiChatThreadsQuery(open && historyOpen);
  const deleteThreadMutation = useDeleteAiChatThreadMutation();

  useEffect(() => {
    if (open) {
      setRendered(true);
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setEntered(true));
      });
      return () => window.cancelAnimationFrame(frame);
    }
    setEntered(false);
    const timer = window.setTimeout(() => setRendered(false), 260);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open, entered, pendingProposals]);

  function handleCreateTaskFromListItem(text: string) {
    setPendingTaskText(text);
  }

  function confirmCreateTask() {
    if (!pendingTaskText) return;
    setTaskSeed({ description: pendingTaskText });
    setPendingTaskText(null);
    setTaskMode("create");
    setTaskOpen(true);
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

  if (!rendered) return null;

  return (
    <>
      <div
        className={cn(
          "fixed bottom-24 right-5 z-40 flex w-[min(100vw-1.25rem,24.5rem)] origin-bottom-right flex-col overflow-hidden",
          "max-h-[min(72dvh,38rem)] rounded-2xl border border-white/10",
          "bg-surface/95 shadow-[0_24px_64px_-12px_rgb(0_0_0_/0.35)] backdrop-blur-xl",
          "ring-1 ring-border/60 dark:bg-surface/90"
        )}
        style={{
          animation: entered
            ? "ims-alice-panel-in 320ms cubic-bezier(0.16, 1, 0.3, 1) both"
            : "ims-alice-panel-out 240ms cubic-bezier(0.4, 0, 1, 1) both",
        }}
        role="dialog"
        aria-label="Alice AI org-wide chat"
        aria-hidden={!open}
      >
        <header className="relative flex shrink-0 items-center gap-2.5 border-b border-border-subtle/80 px-4 py-3">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="min-w-0 flex-1">
            <img
              src={aliceHorizontal}
              alt="Alice"
              className="h-7 w-auto max-w-[9.5rem] object-contain object-left"
            />
            <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
              Org-wide assistant
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Chat history"
              onClick={() => setHistoryOpen(!historyOpen)}
            >
              <History className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              aria-label="New chat"
              onClick={() => resetConversation()}
            >
              <Plus className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close Alice"
              onClick={() => closeChat()}
            >
              <X className="size-4" />
            </Button>
          </div>
        </header>

        {historyOpen ? (
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
            {threadsQuery.isLoading ? (
              <p className="ims-text-meta flex items-center gap-2 justify-center py-6">
                <Loader2 className="size-3.5 animate-spin" /> Loading history…
              </p>
            ) : null}
            {(threadsQuery.data ?? []).length === 0 ? (
              <p className="ims-text-meta py-6 text-center">No saved chats yet.</p>
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
            <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-border-subtle/80 px-3 py-2.5">
              {pinnedRecords.map((pin) => (
                <span
                  key={`${pin.module}:${pin.id}`}
                  className="inline-flex max-w-[9rem] items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[0.65rem] text-primary"
                >
                  <Pin className="size-3 shrink-0" />
                  <span className="truncate">
                    {pin.label ?? `${pin.module}:${pin.id.slice(0, 6)}`}
                  </span>
                  <button
                    type="button"
                    aria-label="Unpin"
                    className="shrink-0 opacity-70 hover:opacity-100"
                    onClick={() => unpinRecord(pin.module, pin.id)}
                  >
                    <PinOff className="size-3" />
                  </button>
                </span>
              ))}
            </div>

            <div
              ref={listRef}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-3 py-3"
            >
              {messages.length === 0 ? (
                <div className="space-y-4 px-1 py-2">
                  <div className="rounded-2xl bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent px-3.5 py-3.5">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Ask anything across your organisation — risks, incidents,
                      tasks, compliance, documents, and more. Answers stay
                      grounded in live IMS records.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {suggestions.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="rounded-xl border border-border-subtle/90 bg-muted/15 px-3 py-2.5 text-left text-xs leading-snug text-foreground/90 transition hover:border-primary/25 hover:bg-primary/[0.06]"
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
                        ? "ml-8 bg-primary text-primary-foreground shadow-sm"
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
                          onCreateTaskFromListItem={
                            handleCreateTaskFromListItem
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
                            onConfirm={() => confirmProposal(proposal, pIndex)}
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
                placeholder="Ask Alice across your organisation…"
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
      </div>

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
        description="This opens the task form pre-filled with Alice's suggestion. Nothing is saved until you confirm in the form."
        confirmLabel="Open task form"
        destructive={false}
        onConfirm={() => confirmCreateTask()}
      />

      <TaskSheet
        open={taskOpen}
        mode={taskMode}
        taskId={undefined}
        onOpenChange={setTaskOpen}
        onModeChange={setTaskMode}
        createDefaults={{
          name: taskSeed.name,
          description: taskSeed.description,
        }}
      />
    </>
  );
}
