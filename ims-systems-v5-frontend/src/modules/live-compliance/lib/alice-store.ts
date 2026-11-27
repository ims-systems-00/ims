import { create } from "zustand";
import type { AliceDraft, AliceTaskId } from "../types";

/** What the ALICE sheet is showing: a new run, or an existing draft. */
export type AliceSheetRequest =
  | { kind: "run"; task: AliceTaskId; ref: string | null; label: string }
  | { kind: "draft"; draft: AliceDraft };

export const useAliceSheetStore = create<{
  request: AliceSheetRequest | null;
  open: (request: AliceSheetRequest) => void;
  close: () => void;
}>((set) => ({
  request: null,
  open: (request) => set({ request }),
  close: () => set({ request: null }),
}));
