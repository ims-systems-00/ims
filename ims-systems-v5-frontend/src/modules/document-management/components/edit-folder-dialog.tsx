import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { notify } from "@/shared/lib/toast";
import { useUpdateFolderNodeMutation } from "../hooks/use-document-management";
import { fromUkDateInputValue, toUkDateInputValue } from "../lib/format";
import { updateFolderFormSchema } from "../schemas";
import type { DocumentTreeNode } from "../types";

type EditFolderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repositoryId: string;
  folder: DocumentTreeNode | null;
};

/**
 * Edit folder name + review date (V4 FolderForm parity).
 */
export function EditFolderDialog({
  open,
  onOpenChange,
  repositoryId,
  folder,
}: EditFolderDialogProps) {
  const updateMutation = useUpdateFolderNodeMutation(repositoryId);
  const [name, setName] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!open || !folder) return;
    setName(folder.name);
    setReviewDate(toUkDateInputValue(folder.folderData?.reviewDate));
    setError(undefined);
  }, [open, folder]);

  async function handleSubmit() {
    if (!folder) return;
    const parsed = updateFolderFormSchema.safeParse({
      name,
      reviewDate: reviewDate.trim() ? reviewDate : null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    const reviewIso =
      parsed.data.reviewDate && parsed.data.reviewDate.trim()
        ? fromUkDateInputValue(parsed.data.reviewDate)
        : null;
    if (parsed.data.reviewDate?.trim() && !reviewIso) {
      setError("Use review date as dd/mm/yyyy");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        nodeId: folder.id,
        body: {
          name: parsed.data.name,
          reviewDate: reviewIso,
        },
      });
      notify.success("Folder updated");
      onOpenChange(false);
    } catch (err) {
      notify.fromError(err, "Unable to update folder");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit folder</DialogTitle>
          <DialogDescription>
            Update the folder name and optional review date.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <FormField
            label="Folder name"
            htmlFor="edit-folder-name"
            required
            error={error}
          >
            <Input
              id="edit-folder-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </FormField>
          <FormField
            label="Folder review date"
            htmlFor="edit-folder-review-date"
            description="Format: dd/mm/yyyy"
          >
            <Input
              id="edit-folder-review-date"
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/yyyy"
              value={reviewDate}
              onChange={(event) => setReviewDate(event.target.value)}
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={updateMutation.isPending || !folder}
          >
            {updateMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            Update folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
