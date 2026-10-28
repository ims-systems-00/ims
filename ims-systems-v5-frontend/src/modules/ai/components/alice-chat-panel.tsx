import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  History,
  Loader2,
  Pin,
  PinOff,
  Plus,
  SendHorizontal,
  Trash2,
  X,
} from "lucide-react";
import aliceHorizontal from "@/assets/images/Type=Horizontal.png";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/lib/utils";
import { notify } from "@/shared/lib/toast";
import { ApiClientError } from "@/shared/lib/http/errors";
import { TaskSheet, type TaskSheetMode } from "@/modules/tasks";
import { streamAliceChat } from "../api/ai";
import {
  useAiChatThreadsQuery,
  useDeleteAiChatThreadMutation,
  aiKeys,
} from "../hooks/use-ai";
import {
  buildPageContext,
  suggestedPromptsForModule,
} from "../lib/page-context";
import { useAliceChatStore } from "../store/use-alice-chat-store";
import { AliceMarkdown } from "./alice-markdown";
import { useQueryClient } from "@tanstack/react-query";
import type { AiChatCitation, AiChatMessage } from "../types-chat";

function newLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Floating Alice grounded chatbot panel.
 */
export function AliceChatPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const open = useAliceChatStore((s) => s.open);
  const closeChat = useAliceChatStore((s) => s.closeChat);
  const threadId = useAliceChatStore((s) => s.threadId);
  const messages = useAliceChatStore((s) => s.messages);
  const pinnedRecords = useAliceChatStore((s) => s.pinnedRecords);
  const streaming = useAliceChatStore((s) => s.streaming);
  const streamBuffer = useAliceChatStore((s) => s.streamBuffer);
  const pendingCitations = useAliceChatStore((s) => s.pendingCitations);
  const error = useAliceChatStore((s) => s.error);
  const historyOpen = useAliceChatStore((s) => s.historyOpen);
  const setHistoryOpen = useAliceChatStore((s) => s.setHistoryOpen);
  const setThreadId = useAliceChatStore((s) => s.setThreadId);
  const setMessages = useAliceChatStore((s) => s.setMessages);
  const appendMessage = useAliceChatStore((s) => s.appendMessage);
  const patchLastAssistant = useAliceChatStore((s) => s.patchLastAssistant);
  const pinRecord = useAliceChatStore((s) => s.pinRecord);
  const unpinRecord = useAliceChatStore((s) => s.unpinRecord);
  const setStreaming = useAliceChatStore((s) => s.setStreaming);
  const setStreamBuffer = useAliceChatStore((s) => s.setStreamBuffer);
  const appendStreamBuffer = useAliceChatStore((s) => s.appendStreamBuffer);
  const setPendingCitations = useAliceChatStore((s) => s.setPendingCitations);
  const setError = useAliceChatStore((s) => s.setError);
  const resetConversation = useAliceChatStore((s) => s.resetConversation);

  const [draft, setDraft] = useState("");
  const [pendingDeleteThreadId, setPendingDeleteThreadId] = useState<
    string | null
  >(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskMode, setTaskMode] = useState<TaskSheetMode>("create");
  const [taskSeed, setTaskSeed] = useState("");
  const [pendingTaskText, setPendingTaskText] = useState<string | null>(null);
  const [pendingOfiText, setPendingOfiText] = useState<string | null>(null);
  const [handoffHint, setHandoffHint] = useState<string | null>(null);
  const [rendered, setRendered] = useState(open);
  const [entered, setEntered] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const pageContext = useMemo(
    () => buildPageContext(location.pathname, location.search),
    [location.pathname, location.search]
  );
  const suggestions = useMemo(
    () => suggestedPromptsForModule(pageContext.moduleHint),
    [pageContext.moduleHint]
  );

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
  }, [messages, streamBuffer, open, entered]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function sendMessage(text: string) {
    const message = text.trim();
    if (!message || streaming) return;

    setError(null);
    setDraft("");
    const userMessage: AiChatMessage = {
      id: newLocalId("user"),
      role: "user",
      content: message,
    };
    appendMessage(userMessage);
    appendMessage({
      id: newLocalId("assistant"),
      role: "assistant",
      content: "",
      citations: [],
    });
    setStreaming(true);
    setStreamBuffer("");
    setPendingCitations([]);

    const conversation = [...messages, userMessage]
      .filter((row) => row.role === "user" || row.role === "assistant")
      .map((row) => ({
        role: row.role as "user" | "assistant",
        content: row.content,
      }))
      .slice(-8);

    const controller = new AbortController();
    abortRef.current = controller;

    let localBuffer = "";
    let localCitations: AiChatCitation[] = [];

    try {
      await streamAliceChat(
        {
          message,
          threadId: threadId ?? undefined,
          pageContext,
          pinnedRecords: pinnedRecords.map((row) => ({
            module: row.module,
            id: row.id,
          })),
          conversation,
        },
        {
          signal: controller.signal,
          onEvent: (event) => {
            if (event.type === "citations") {
              localCitations = event.citations;
              setPendingCitations(event.citations);
            }
            if (event.type === "token") {
              localBuffer += event.text;
              appendStreamBuffer(event.text);
              patchLastAssistant(localBuffer, localCitations);
            }
            if (event.type === "done") {
              setThreadId(event.threadId);
              localCitations = event.citations;
              patchLastAssistant(
                localBuffer || "I could not generate a response.",
                event.citations
              );
              void queryClient.invalidateQueries({
                queryKey: aiKeys.chatThreads(),
              });
            }
            if (event.type === "error") {
              setError(event.message);
            }
          },
        }
      );
    } catch (err) {
      if (controller.signal.aborted) return;
      const messageText =
        err instanceof ApiClientError
          ? err.message
          : "Unable to reach Alice right now";
      setError(messageText);
      patchLastAssistant(
        localBuffer ||
          "Sorry — I could not complete that answer. Please try again."
      );
      if (err instanceof ApiClientError && err.code === "AI_NOT_CONFIGURED") {
        notify.error("Alice is not configured on the server.");
      }
    } finally {
      setStreaming(false);
      setStreamBuffer("");
      abortRef.current = null;
    }
  }

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

  function handleCreateTaskFromListItem(text: string) {
    setPendingTaskText(text);
  }

  function confirmCreateTask() {
    if (!pendingTaskText) return;
    setTaskSeed(pendingTaskText);
    setPendingTaskText(null);
    setTaskMode("create");
    setTaskOpen(true);
  }

  function handleAnalyticalHandoff() {
    const selected = pageContext.selectedIds?.[0];
    if (!selected) {
      setHandoffHint(
        "Open a risk, incident, or audit record, then use Analyse on that sheet for a full Alice report."
      );
      return;
    }
    if (!["risks", "incidents", "audits"].includes(selected.module)) {
      setHandoffHint(
        "Full Analytical Assistant reports are available on risks, incidents, and audits."
      );
      return;
    }
    setHandoffHint(
      "Use the Analyse button on the open record sheet for a full multi-section Alice report. Chat stays for quick Q&A."
    );
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
        aria-label="Alice AI chat"
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
              <p className="ims-text-meta flex items-center gap-2 py-6 justify-center">
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
              <ToolbarChip onClick={() => handlePinCurrentPage()}>
                <Pin className="size-3" />
                Pin
              </ToolbarChip>
              <ToolbarChip onClick={() => handleAnalyticalHandoff()}>
                Full analysis
              </ToolbarChip>
              <ToolbarChip
                disabled={
                  !messages.some((m) => m.role === "assistant" && m.content)
                }
                onClick={() => {
                  const last = [...messages]
                    .reverse()
                    .find((m) => m.role === "assistant" && m.content.trim());
                  if (last) setPendingOfiText(last.content.slice(0, 1500));
                }}
              >
                Create OFI
              </ToolbarChip>
              {pinnedRecords.map((pin) => (
                <span
                  key={`${pin.module}:${pin.id}`}
                  className="inline-flex max-w-[9rem] items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[0.65rem] text-primary"
                >
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

            {handoffHint ? (
              <p className="shrink-0 border-b border-border-subtle/80 px-4 py-2 text-xs leading-relaxed text-muted-foreground">
                {handoffHint}
              </p>
            ) : null}

            <div
              ref={listRef}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-3 py-3"
            >
              {messages.length === 0 ? (
                <div className="space-y-4 px-1 py-2">
                  <div className="rounded-2xl bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent px-3.5 py-3.5">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Ask about risks, incidents, audits, documents, compliance,
                      or OFIs. Answers stay grounded in your organisation.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {suggestions.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="rounded-xl border border-border-subtle/90 bg-muted/15 px-3 py-2.5 text-left text-xs leading-snug text-foreground/90 transition hover:border-primary/25 hover:bg-primary/[0.06]"
                        onClick={() => void sendMessage(prompt)}
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
                          <CitationChip
                            key={`${cite.module}:${cite.id}`}
                            cite={cite}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {streaming &&
              pendingCitations.length > 0 &&
              !messages.at(-1)?.citations?.length ? (
                <div className="flex max-w-full flex-wrap gap-1.5 px-1">
                  {pendingCitations.map((cite) => (
                    <CitationChip
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
                void sendMessage(draft);
              }}
            >
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask Alice about your IMS…"
                rows={2}
                className="min-h-[2.75rem] max-h-28 resize-none rounded-xl border-border-subtle bg-surface text-sm shadow-none focus-visible:ring-primary/30"
                disabled={streaming}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage(draft);
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                className="size-10 shrink-0 rounded-xl"
                disabled={streaming || !draft.trim()}
                aria-label="Send"
              >
                {streaming ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <SendHorizontal className="size-4" />
                )}
              </Button>
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

      <ConfirmDialog
        open={Boolean(pendingOfiText)}
        onOpenChange={(next) => {
          if (!next) setPendingOfiText(null);
        }}
        title="Create OFI from this answer?"
        description="You will be taken to Continual Improvement with Alice's answer as a draft description. The OFI is not created until you submit the form."
        confirmLabel="Continue to OFI"
        destructive={false}
        onConfirm={() => {
          if (!pendingOfiText) return;
          const params = new URLSearchParams({
            create: "1",
            description: pendingOfiText.slice(0, 1500),
          });
          setPendingOfiText(null);
          closeChat();
          navigate(`/ofi?${params.toString()}`);
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
        createDefaults={{ description: taskSeed }}
      />
    </>
  );
}

function ToolbarChip({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full border border-border-subtle/90 bg-muted/20 px-2.5 text-[0.68rem] font-medium text-muted-foreground transition",
        "hover:border-primary/20 hover:bg-primary/[0.06] hover:text-foreground",
        "disabled:cursor-not-allowed disabled:opacity-40"
      )}
    >
      {children}
    </button>
  );
}

function CitationChip({ cite }: { cite: AiChatCitation }) {
  return (
    <Link
      to={cite.href}
      className="inline-flex max-w-full truncate rounded-full border border-primary/15 bg-primary/[0.06] px-2 py-0.5 text-[0.65rem] text-primary transition hover:bg-primary/10"
      title={cite.title}
    >
      <span className="truncate">
        {[cite.reference, cite.title].filter(Boolean).join(" — ")}
      </span>
    </Link>
  );
}

function mapTaskModule(module: string): string {
  if (module === "ofi") return "cips";
  if (module === "documents") return "documenttrees";
  return module;
}
