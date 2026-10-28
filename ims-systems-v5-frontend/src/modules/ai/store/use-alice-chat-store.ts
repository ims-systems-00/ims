import { create } from "zustand";
import type {
  AiChatCitation,
  AiChatMessage,
  AiChatPinnedRecord,
} from "../types-chat";

type AliceChatState = {
  open: boolean;
  threadId: string | null;
  messages: AiChatMessage[];
  pinnedRecords: AiChatPinnedRecord[];
  streaming: boolean;
  streamBuffer: string;
  pendingCitations: AiChatCitation[];
  error: string | null;
  historyOpen: boolean;
  setOpen: (open: boolean) => void;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  setThreadId: (threadId: string | null) => void;
  setMessages: (messages: AiChatMessage[]) => void;
  appendMessage: (message: AiChatMessage) => void;
  patchLastAssistant: (content: string, citations?: AiChatCitation[]) => void;
  setPinnedRecords: (records: AiChatPinnedRecord[]) => void;
  pinRecord: (record: AiChatPinnedRecord) => void;
  unpinRecord: (module: string, id: string) => void;
  setStreaming: (streaming: boolean) => void;
  setStreamBuffer: (text: string) => void;
  appendStreamBuffer: (text: string) => void;
  setPendingCitations: (citations: AiChatCitation[]) => void;
  setError: (error: string | null) => void;
  setHistoryOpen: (open: boolean) => void;
  resetConversation: () => void;
};

/**
 * Client UI state for the floating Alice chatbot.
 */
export const useAliceChatStore = create<AliceChatState>((set) => ({
  open: false,
  threadId: null,
  messages: [],
  pinnedRecords: [],
  streaming: false,
  streamBuffer: "",
  pendingCitations: [],
  error: null,
  historyOpen: false,
  setOpen: (open) => set({ open }),
  openChat: () => set({ open: true }),
  closeChat: () => set({ open: false, historyOpen: false }),
  toggleChat: () => set((state) => ({ open: !state.open })),
  setThreadId: (threadId) => set({ threadId }),
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  patchLastAssistant: (content, citations) =>
    set((state) => {
      const messages = [...state.messages];
      for (let i = messages.length - 1; i >= 0; i -= 1) {
        if (messages[i]?.role === "assistant") {
          messages[i] = {
            ...messages[i]!,
            content,
            ...(citations ? { citations } : {}),
          };
          break;
        }
      }
      return { messages };
    }),
  setPinnedRecords: (pinnedRecords) => set({ pinnedRecords }),
  pinRecord: (record) =>
    set((state) => {
      if (
        state.pinnedRecords.some(
          (row) => row.module === record.module && row.id === record.id
        )
      ) {
        return state;
      }
      return { pinnedRecords: [...state.pinnedRecords, record].slice(0, 8) };
    }),
  unpinRecord: (module, id) =>
    set((state) => ({
      pinnedRecords: state.pinnedRecords.filter(
        (row) => !(row.module === module && row.id === id)
      ),
    })),
  setStreaming: (streaming) => set({ streaming }),
  setStreamBuffer: (streamBuffer) => set({ streamBuffer }),
  appendStreamBuffer: (text) =>
    set((state) => ({ streamBuffer: state.streamBuffer + text })),
  setPendingCitations: (pendingCitations) => set({ pendingCitations }),
  setError: (error) => set({ error }),
  setHistoryOpen: (historyOpen) => set({ historyOpen }),
  resetConversation: () =>
    set({
      threadId: null,
      messages: [],
      streamBuffer: "",
      pendingCitations: [],
      error: null,
      streaming: false,
    }),
}));
