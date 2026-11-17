import { useState } from "react";
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
import { useCreateFolderNodeMutation } from "../hooks/use-document-management";
import { fromDateInputValue } from "../lib/format";
import { createFolderFormSchema } from "../schemas";

type CreateFolderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repositoryId: string;
  parentNodeId: string | null;
};

export function CreateFolderDialog({
  open,
  onOpenChange,
  repositoryId,
  parentNodeId,
}: CreateFolderDialogProps) {
  const createMutation = useCreateFolderNodeMutation(repositoryId);
  const [name, setName] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [error, setError] = useState<string | undefined>();

  function reset() {
    setName("");
    setReviewDate("");
    setError(undefined);
  }

  async function handleSubmit() {
    const parsed = createFolderFormSchema.safeParse({
      name,
      reviewDate: reviewDate.trim() ? reviewDate : null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    const reviewIso =
      parsed.data.reviewDate && parsed.data.reviewDate.trim()
        ? fromDateInputValue(parsed.data.reviewDate)
        : null;
    if (parsed.data.reviewDate?.trim() && !reviewIso) {
      setError("Select a valid review date");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: parsed.data.name,
        parentNodeId,
        reviewDate: reviewIso,
      });
      notify.success("Folder created");
      reset();
      onOpenChange(false);
    } catch (err) {
      notify.fromError(err, "Unable to create folder");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>
            Folders organise documents inside this repository. Optionally set a
            folder review date for documents that inherit it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <FormField
            label="Folder name"
            htmlFor="folder-name"
            required
            error={error}
          >
            <Input
              id="folder-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Policies"
              autoFocus
            />
          </FormField>
          <FormField label="Folder review date" htmlFor="folder-review-date">
            <Input
              id="folder-review-date"
              type="date"
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
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
