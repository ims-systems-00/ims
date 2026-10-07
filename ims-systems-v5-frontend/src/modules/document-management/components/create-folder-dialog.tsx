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
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit() {
    const parsed = createFolderFormSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: parsed.data.name,
        parentNodeId,
      });
      notify.success("Folder created");
      setName("");
      setError(undefined);
      onOpenChange(false);
    } catch (err) {
      notify.fromError(err, "Unable to create folder");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setName("");
          setError(undefined);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>
            Folders organise documents inside this repository.
          </DialogDescription>
        </DialogHeader>
        <FormField label="Folder name" htmlFor="folder-name" required error={error}>
          <Input
            id="folder-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Policies"
            autoFocus
          />
        </FormField>
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
