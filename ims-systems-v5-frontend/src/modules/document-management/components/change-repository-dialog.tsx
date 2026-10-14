import { useState } from "react";
import { AppSheet } from "@/shared/components/app-sheet";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  useChangeNodeRepositoryMutation,
  useDocumentRepositoriesQuery,
} from "../hooks/use-document-management";
import type { DocumentTreeNode } from "../types";

type ChangeRepositoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repositoryId: string;
  node: DocumentTreeNode | null;
};

export function ChangeRepositoryDialog({
  open,
  onOpenChange,
  repositoryId,
  node,
}: ChangeRepositoryDialogProps) {
  const [targetId, setTargetId] = useState("");
  const reposQuery = useDocumentRepositoriesQuery({
    page: 1,
    pageSize: 100,
    deleted: false,
    sort: "name",
    sortDir: "asc",
  });
  const changeMutation = useChangeNodeRepositoryMutation(repositoryId);

  const repos = (reposQuery.data?.items ?? []).filter(
    (repo) => repo.id !== repositoryId
  );

  async function handleChange() {
    if (!node || !targetId) return;
    try {
      await changeMutation.mutateAsync({
        nodeId: node.id,
        targetRepositoryId: targetId,
        parentNodeId: null,
      });
      notify.success("Moved to another repository");
      onOpenChange(false);
      setTargetId("");
    } catch (error) {
      notify.fromError(error, "Unable to change repository");
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Change repository"
      description={
        node
          ? `Move “${node.name}” into another repository (root folder).`
          : "Select a target repository."
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
            disabled={!node || !targetId || changeMutation.isPending}
            onClick={() => void handleChange()}
          >
            Move
          </Button>
        </div>
      }
    >
      <label className="block space-y-1.5 text-[0.8125rem]">
        <span className="font-medium">Target repository</span>
        <select
          className="ims-select w-full"
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
        >
          <option value="">Select…</option>
          {repos.map((repo) => (
            <option key={repo.id} value={repo.id}>
              {repo.name}
            </option>
          ))}
        </select>
      </label>
    </AppSheet>
  );
}
