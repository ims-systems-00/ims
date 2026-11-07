import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import { streamAliceChat } from "../api/ai";
import { aiKeys } from "./use-ai";
import { useAliceChatStore } from "../store/use-alice-chat-store";
import type {
  AiChatCitation,
  AiChatMessage,
  AiChatPageContext,
  AiChatProposal,
  AiChatSurfaceMode,
} from "../types-chat";

function newLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Shared send/stream/abort logic for float + sidebar Alice surfaces.
 */
export function useAliceChatSession(surfaceMode: AiChatSurfaceMode) {
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);

  const threadId = useAliceChatStore((s) => s.threadId);
  const messages = useAliceChatStore((s) => s.messages);
  const pinnedRecords = useAliceChatStore((s) => s.pinnedRecords);
  const streaming = useAliceChatStore((s) => s.streaming);
  const appendMessage = useAliceChatStore((s) => s.appendMessage);
  const patchLastAssistant = useAliceChatStore((s) => s.patchLastAssistant);
  const setThreadId = useAliceChatStore((s) => s.setThreadId);
  const setStreaming = useAliceChatStore((s) => s.setStreaming);
  const setStreamBuffer = useAliceChatStore((s) => s.setStreamBuffer);
  const appendStreamBuffer = useAliceChatStore((s) => s.appendStreamBuffer);
  const setPendingCitations = useAliceChatStore((s) => s.setPendingCitations);
  const setPendingProposals = useAliceChatStore((s) => s.setPendingProposals);
  const appendPendingProposal = useAliceChatStore(
    (s) => s.appendPendingProposal
  );
  const setError = useAliceChatStore((s) => s.setError);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, [setStreaming]);

  const sendMessage = useCallback(
    async (text: string, pageContext: AiChatPageContext) => {
      const message = text.trim();
      if (!message || streaming) return;

      setError(null);
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
        proposals: [],
      });
      setStreaming(true);
      setStreamBuffer("");
      setPendingCitations([]);
      setPendingProposals([]);

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
      const localProposals: AiChatProposal[] = [];

      try {
        await streamAliceChat(
          {
            message,
            threadId: threadId ?? undefined,
            surfaceMode,
            pageContext:
              surfaceMode === "page"
                ? pageContext
                : {
                    pathname: pageContext.pathname,
                    // Soft awareness only for general mode
                    moduleHint: pageContext.moduleHint,
                  },
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
              if (event.type === "proposal") {
                const proposal: AiChatProposal = {
                  action: event.action,
                  payload: event.payload,
                };
                localProposals.push(proposal);
                appendPendingProposal(proposal);
                patchLastAssistant(localBuffer, localCitations, [
                  ...localProposals,
                ]);
              }
              if (event.type === "token") {
                localBuffer += event.text;
                appendStreamBuffer(event.text);
                patchLastAssistant(
                  localBuffer,
                  localCitations,
                  localProposals.length ? [...localProposals] : undefined
                );
              }
              if (event.type === "done") {
                setThreadId(event.threadId);
                localCitations = event.citations;
                patchLastAssistant(
                  localBuffer || "I could not generate a response.",
                  event.citations,
                  localProposals.length ? [...localProposals] : undefined
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
        if (err instanceof ApiClientError) {
          if (err.code === "AI_NOT_CONFIGURED") {
            notify.error("Alice is not configured on the server.");
          } else if (err.status === 403) {
            notify.error(
              "Alice chat requires Head of Service or Super Admin access."
            );
          }
        }
      } finally {
        setStreaming(false);
        setStreamBuffer("");
        abortRef.current = null;
      }
    },
    [
      appendMessage,
      appendPendingProposal,
      appendStreamBuffer,
      messages,
      patchLastAssistant,
      pinnedRecords,
      queryClient,
      setError,
      setPendingCitations,
      setPendingProposals,
      setStreamBuffer,
      setStreaming,
      setThreadId,
      streaming,
      surfaceMode,
      threadId,
    ]
  );

  return { sendMessage, stopStreaming, abortRef };
}
