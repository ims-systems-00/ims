import { beforeEach, describe, expect, it } from "vitest";
import {
  MAX_PINNED_FOLDERS,
  usePinnedFoldersStore,
} from "@/modules/document-management/store/use-pinned-folders-store";

function resetStore() {
  usePinnedFoldersStore.setState({ byOrg: {} });
  try {
    localStorage.removeItem("ims.documents.pinned-folders");
  } catch {
    /* ignore */
  }
}

describe("usePinnedFoldersStore", () => {
  beforeEach(resetStore);

  it("pins and unpins a folder", () => {
    const result = usePinnedFoldersStore.getState().pinFolder({
      repositoryId: "repo-1",
      folderId: "folder-1",
      name: "Policies",
      repositoryName: "Controlled docs",
    });
    expect(result.ok).toBe(true);
    expect(
      usePinnedFoldersStore.getState().isPinned("repo-1", "folder-1")
    ).toBe(true);
    expect(usePinnedFoldersStore.getState().listPinned()).toHaveLength(1);

    usePinnedFoldersStore.getState().unpinFolder("repo-1", "folder-1");
    expect(
      usePinnedFoldersStore.getState().isPinned("repo-1", "folder-1")
    ).toBe(false);
  });

  it("blocks pinning more than the max", () => {
    for (let i = 0; i < MAX_PINNED_FOLDERS; i += 1) {
      const result = usePinnedFoldersStore.getState().pinFolder({
        repositoryId: "repo-1",
        folderId: `folder-${i}`,
        name: `Folder ${i}`,
        repositoryName: "Controlled docs",
      });
      expect(result.ok).toBe(true);
    }

    const blocked = usePinnedFoldersStore.getState().pinFolder({
      repositoryId: "repo-1",
      folderId: "folder-extra",
      name: "Extra",
      repositoryName: "Controlled docs",
    });
    expect(blocked).toEqual({ ok: false, reason: "limit" });
    expect(usePinnedFoldersStore.getState().listPinned()).toHaveLength(
      MAX_PINNED_FOLDERS
    );
  });
});
