import { create } from "zustand";
import type { DocumentsTabId } from "../types";

type DocumentsUiState = {
  tab: DocumentsTabId;
  setTab: (tab: DocumentsTabId) => void;
  createRepoOpen: boolean;
  setCreateRepoOpen: (open: boolean) => void;
};

/**
 * Client UI state for Documents list (tabs / create sheet).
 * Server data stays in TanStack Query.
 */
export const useDocumentsUiStore = create<DocumentsUiState>((set) => ({
  tab: "overview",
  setTab: (tab) => set({ tab }),
  createRepoOpen: false,
  setCreateRepoOpen: (createRepoOpen) => set({ createRepoOpen }),
}));
