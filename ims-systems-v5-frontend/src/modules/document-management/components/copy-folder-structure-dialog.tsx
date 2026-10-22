import { useState } from "react";
import { AppSheet } from "@/shared/components/app-sheet";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  useCopyFolderStructureMutation,
  useCrossOrgCopySourcesQuery,
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
  // Selection value: "same:<repoId>" or "cross:<orgId>:<repoId>".
  const [selection, setSelection] = useState("");
  const reposQuery = useDocumentRepositoriesQuery({
    page: 1,
    pageSize: 100,
    deleted: false,
    sort: "name",
    sortDir: "asc",
  });
  // Only Super Admins get cross-org sources; the query fails silently (403)
  // for everyone else and the section simply stays hidden.
  const crossOrgQuery = useCrossOrgCopySourcesQuery(open);
  const copyMutation = useCopyFolderStructureMutation(repositoryId);

  const sources = (reposQuery.data?.items ?? []).filter(
    (repo) => repo.id !== repositoryId
  );
  const crossOrgSources = (crossOrgQuery.data ?? []).filter(
    (source) => source.repositories.length > 0
  );

  async function handleCopy() {
    if (!selection) return;
    const parts = selection.split(":");
    const isCross = parts[0] === "cross";
    const sourceOrgId = isCross ? parts[1] : undefined;
    const sourceRepoId = isCross ? parts[2] : parts[1];
    if (!sourceRepoId) return;
    try {
      await copyMutation.mutateAsync({ sourceRepoId, sourceOrgId });
      notify.success("Folder structure copied");
      onOpenChange(false);
      setSelection("");
    } catch (error) {
      notify.fromError(error, "Unable to copy folder structure");
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Copy folder structure"
      description="Copy folders only from another repository. Documents are not copied. Cross-organisation sources are available to Super Admins only."
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
            disabled={!selection || copyMutation.isPending}
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
          value={selection}
          onChange={(event) => setSelection(event.target.value)}
        >
          <option value="">Select…</option>
          <optgroup label="This organisation">
            {sources.map((repo) => (
              <option key={repo.id} value={`same:${repo.id}`}>
                {repo.name}
              </option>
            ))}
          </optgroup>
          {crossOrgSources.map((source) => (
            <optgroup
              key={source.organizationId}
              label={`Organisation ${source.organizationId.slice(0, 8)}…`}
            >
              {source.repositories.map((repo) => (
                <option
                  key={repo.id}
                  value={`cross:${source.organizationId}:${repo.id}`}
                >
                  {repo.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
    </AppSheet>
  );
}
