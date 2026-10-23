import { create } from "zustand";

type GlobalSearchState = {
  query: string;
  open: boolean;
  setQuery: (query: string) => void;
  setOpen: (open: boolean) => void;
  reset: () => void;
};

/** Shared navbar search state (F-07). */
export const useGlobalSearchStore = create<GlobalSearchState>((set) => ({
  query: "",
  open: false,
  setQuery: (query) => set({ query, open: query.trim().length >= 2 }),
  setOpen: (open) => set({ open }),
  reset: () => set({ query: "", open: false }),
}));
