import { create } from "zustand";
import { getActiveOrganisationId } from "@/shared/lib/active-organisation";

export const MAX_PINNED_FOLDERS = 8;

const STORAGE_KEY = "ims.documents.pinned-folders";

export type PinnedFolder = {
  repositoryId: string;
  folderId: string;
  name: string;
  repositoryName: string;
  pinnedAt: string;
};

type PinnedFoldersState = {
  /** Org id → pinned folders (max 8 each). */
  byOrg: Record<string, PinnedFolder[]>;
  pinFolder: (folder: Omit<PinnedFolder, "pinnedAt">) => {
    ok: boolean;
    reason?: "already" | "limit";
  };
  unpinFolder: (repositoryId: string, folderId: string) => void;
  isPinned: (repositoryId: string, folderId: string) => boolean;
  listPinned: () => PinnedFolder[];
};

function orgKey(): string {
  return getActiveOrganisationId() ?? "default";
}

function readStore(): Record<string, PinnedFolder[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, PinnedFolder[]>;
  } catch {
    return {};
  }
}

function writeStore(byOrg: Record<string, PinnedFolder[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(byOrg));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Client-persisted pinned document folders for the Documents overview.
 */
export const usePinnedFoldersStore = create<PinnedFoldersState>((set, get) => ({
  byOrg: typeof window !== "undefined" ? readStore() : {},

  pinFolder: (folder) => {
    const key = orgKey();
    const current = get().byOrg[key] ?? [];
    if (
      current.some(
        (row) =>
          row.repositoryId === folder.repositoryId &&
          row.folderId === folder.folderId
      )
    ) {
      return { ok: false, reason: "already" };
    }
    if (current.length >= MAX_PINNED_FOLDERS) {
      return { ok: false, reason: "limit" };
    }
    const next = {
      ...get().byOrg,
      [key]: [
        ...current,
        { ...folder, pinnedAt: new Date().toISOString() },
      ],
    };
    writeStore(next);
    set({ byOrg: next });
    return { ok: true };
  },

  unpinFolder: (repositoryId, folderId) => {
    const key = orgKey();
    const current = get().byOrg[key] ?? [];
    const nextList = current.filter(
      (row) =>
        !(row.repositoryId === repositoryId && row.folderId === folderId)
    );
    const next = { ...get().byOrg, [key]: nextList };
    writeStore(next);
    set({ byOrg: next });
  },

  isPinned: (repositoryId, folderId) => {
    const key = orgKey();
    return (get().byOrg[key] ?? []).some(
      (row) =>
        row.repositoryId === repositoryId && row.folderId === folderId
    );
  },

  listPinned: () => {
    const key = orgKey();
    return get().byOrg[key] ?? [];
  },
}));
