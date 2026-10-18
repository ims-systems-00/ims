import { useMemo, useState } from "react";
import { AppSheet } from "@/shared/components/app-sheet";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  useMoveRepoNodeMutation,
  useRepoNodesQuery,
} from "../hooks/use-document-management";
import type { DocumentTreeNode } from "../types";

type MoveNodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repositoryId: string;
  node: DocumentTreeNode | null;
};

export function MoveNodeDialog({
  open,
  onOpenChange,
  repositoryId,
  node,
}: MoveNodeDialogProps) {
  const [targetParentId, setTargetParentId] = useState<string | null>(null);
  const foldersQuery = useRepoNodesQuery(repositoryId, {
    page: 1,
    pageSize: 200,
    parentNodeId: null,
    type: "folder",
    sort: "name",
    sortDir: "asc",
  });
  const moveMutation = useMoveRepoNodeMutation(repositoryId);

  const folders = useMemo(
    () =>
      (foldersQuery.data?.items ?? []).filter(
        (item) => item.type === "folder" && item.id !== node?.id
      ),
    [foldersQuery.data?.items, node?.id]
  );

  async function handleMove() {
    if (!node) return;
    try {
      await moveMutation.mutateAsync({
        nodeId: node.id,
        parentNodeId: targetParentId,
      });
      notify.success("Item moved");
      onOpenChange(false);
      setTargetParentId(null);
    } catch (error) {
      notify.fromError(error, "Unable to move item");
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Move item"
      description={
        node
          ? `Choose a destination folder for “${node.name}”.`
          : "Choose a destination folder."
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!node || moveMutation.isPending}
            onClick={() => void handleMove()}
          >
            Move
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <label className="block space-y-1.5 text-[0.8125rem]">
          <span className="font-medium">Destination</span>
          <select
            className="ims-select w-full"
            value={targetParentId ?? ""}
            onChange={(event) =>
              setTargetParentId(event.target.value || null)
            }
          >
            <option value="">Root</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-[0.75rem] text-muted-foreground">
          Root-level folders are listed. Move into nested folders by opening
          them first, or pick Root.
        </p>
      </div>
    </AppSheet>
  );
}
