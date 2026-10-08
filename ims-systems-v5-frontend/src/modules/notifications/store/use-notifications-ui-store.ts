import { create } from "zustand";

type NotificationsUiState = {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
};

/**
 * Client UI state for the notifications bell drawer.
 * Server data stays in TanStack Query.
 */
export const useNotificationsUiStore = create<NotificationsUiState>((set) => ({
  drawerOpen: false,
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
}));
