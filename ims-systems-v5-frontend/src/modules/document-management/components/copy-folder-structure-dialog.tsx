import { useState } from "react";
import { AppSheet } from "@/shared/components/app-sheet";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  useCopyFolderStructureMutation,
  useDocumentRepositoriesQuery,
} from "../hooks/use-document-management";

type CopyFolderStructureDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repositoryId: string;
};

export function CopyFolderStructureDialog({
  open,
  onOpenChange,
  repositoryId,
}: CopyFolderStructureDialogProps) {
  const [sourceRepoId, setSourceRepoId] = useState("");
  const reposQuery = useDocumentRepositoriesQuery({
    page: 1,
    pageSize: 100,
    deleted: false,
    sort: "name",
    sortDir: "asc",
  });
  const copyMutation = useCopyFolderStructureMutation(repositoryId);

  const sources = (reposQuery.data?.items ?? []).filter(
    (repo) => repo.id !== repositoryId
  );

  async function handleCopy() {
    if (!sourceRepoId) return;
    try {
      await copyMutation.mutateAsync(sourceRepoId);
      notify.success("Folder structure copied");
      onOpenChange(false);
      setSourceRepoId("");
    } catch (error) {
      notify.fromError(error, "Unable to copy folder structure");
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Copy folder structure"
      description="Copy folders only from another repository in this organisation. Documents are not copied."
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
            disabled={!sourceRepoId || copyMutation.isPending}
            onClick={() => void handleCopy()}
          >
            Copy folders
          </Button>
        </div>
      }
    >
      <label className="block space-y-1.5 text-[0.8125rem]">
        <span className="font-medium">Source repository</span>
        <select
          className="ims-select w-full"
          value={sourceRepoId}
          onChange={(event) => setSourceRepoId(event.target.value)}
        >
          <option value="">Select…</option>
          {sources.map((repo) => (
            <option key={repo.id} value={repo.id}>
              {repo.name}
            </option>
          ))}
        </select>
      </label>
    </AppSheet>
  );
}
