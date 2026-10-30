import { create } from "zustand";
import type {
  AiChatCitation,
  AiChatMessage,
  AiChatPinnedRecord,
  AiChatProposal,
  AliceChatSurface,
} from "../types-chat";

type AliceChatState = {
  /** Which surface is open; null = both closed. */
  surface: AliceChatSurface | null;
  threadId: string | null;
  messages: AiChatMessage[];
  pinnedRecords: AiChatPinnedRecord[];
  streaming: boolean;
  streamBuffer: string;
  pendingCitations: AiChatCitation[];
  pendingProposals: AiChatProposal[];
  error: string | null;
  historyOpen: boolean;
  /** @deprecated Prefer `surface === "float" || surface === "sidebar"`. */
  open: boolean;
  openFloat: () => void;
  openSidebar: () => void;
  closeChat: () => void;
  toggleFloat: () => void;
  /** @deprecated Prefer openFloat / openSidebar. */
  openChat: () => void;
  /** @deprecated Prefer toggleFloat. */
  toggleChat: () => void;
  setOpen: (open: boolean) => void;
  setThreadId: (threadId: string | null) => void;
  setMessages: (messages: AiChatMessage[]) => void;
  appendMessage: (message: AiChatMessage) => void;
  patchLastAssistant: (
    content: string,
    citations?: AiChatCitation[],
    proposals?: AiChatProposal[]
  ) => void;
  setPinnedRecords: (records: AiChatPinnedRecord[]) => void;
  pinRecord: (record: AiChatPinnedRecord) => void;
  unpinRecord: (module: string, id: string) => void;
  setStreaming: (streaming: boolean) => void;
  setStreamBuffer: (text: string) => void;
  appendStreamBuffer: (text: string) => void;
  setPendingCitations: (citations: AiChatCitation[]) => void;
  setPendingProposals: (proposals: AiChatProposal[]) => void;
  appendPendingProposal: (proposal: AiChatProposal) => void;
  clearPendingProposals: () => void;
  dismissProposal: (index: number) => void;
  setError: (error: string | null) => void;
  setHistoryOpen: (open: boolean) => void;
  resetConversation: () => void;
};

/**
 * Shared client UI state for floating + sidebar Alice chat.
 */
export const useAliceChatStore = create<AliceChatState>((set) => ({
  surface: null,
  open: false,
  threadId: null,
  messages: [],
  pinnedRecords: [],
  streaming: false,
  streamBuffer: "",
  pendingCitations: [],
  pendingProposals: [],
  error: null,
  historyOpen: false,
  openFloat: () =>
    set({ surface: "float", open: true, historyOpen: false }),
  openSidebar: () =>
    set({ surface: "sidebar", open: true, historyOpen: false }),
  closeChat: () =>
    set({ surface: null, open: false, historyOpen: false }),
  toggleFloat: () =>
    set((state) =>
      state.surface === "float"
        ? { surface: null, open: false, historyOpen: false }
        : { surface: "float", open: true, historyOpen: false }
    ),
  openChat: () =>
    set({ surface: "float", open: true, historyOpen: false }),
  toggleChat: () =>
    set((state) =>
      state.surface === "float"
        ? { surface: null, open: false, historyOpen: false }
        : { surface: "float", open: true, historyOpen: false }
    ),
  setOpen: (open) =>
    set((state) => ({
      open,
      surface: open ? state.surface ?? "float" : null,
      historyOpen: open ? state.historyOpen : false,
    })),
  setThreadId: (threadId) => set({ threadId }),
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  patchLastAssistant: (content, citations, proposals) =>
    set((state) => {
      const messages = [...state.messages];
      for (let i = messages.length - 1; i >= 0; i -= 1) {
        if (messages[i]?.role === "assistant") {
          messages[i] = {
            ...messages[i]!,
            content,
            ...(citations ? { citations } : {}),
            ...(proposals ? { proposals } : {}),
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
  setPendingProposals: (pendingProposals) => set({ pendingProposals }),
  appendPendingProposal: (proposal) =>
    set((state) => ({
      pendingProposals: [...state.pendingProposals, proposal],
    })),
  clearPendingProposals: () => set({ pendingProposals: [] }),
  dismissProposal: (index) =>
    set((state) => ({
      pendingProposals: state.pendingProposals.filter((_, i) => i !== index),
      messages: state.messages.map((msg, mi) => {
        if (mi !== state.messages.length - 1 || msg.role !== "assistant") {
          return msg;
        }
        if (!msg.proposals?.length) return msg;
        return {
          ...msg,
          proposals: msg.proposals.filter((_, i) => i !== index),
        };
      }),
    })),
  setError: (error) => set({ error }),
  setHistoryOpen: (historyOpen) => set({ historyOpen }),
  resetConversation: () =>
    set({
      threadId: null,
      messages: [],
      streamBuffer: "",
      pendingCitations: [],
      pendingProposals: [],
      error: null,
      streaming: false,
    }),
}));
