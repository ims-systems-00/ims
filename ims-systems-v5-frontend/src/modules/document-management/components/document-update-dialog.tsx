import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { useUpdateDocumentNodeMutation } from "../hooks/use-document-management";
import type { DocumentTreeNode } from "../types";
import { DocumentInfoEditForm } from "./document-info-edit-form";

type DocumentUpdateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repositoryId: string;
  node: DocumentTreeNode;
};

const FORM_ID = "document-update-dialog-form";

/**
 * Popup to update document purpose, modules, owners, and review date.
 */
export function DocumentUpdateDialog({
  open,
  onOpenChange,
  repositoryId,
  node,
}: DocumentUpdateDialogProps) {
  const pending = useUpdateDocumentNodeMutation(repositoryId).isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update document information</DialogTitle>
          <DialogDescription>
            Change purpose, applicable modules, owners, and review date for{" "}
            <span className="font-medium text-foreground">{node.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <DocumentInfoEditForm
          formId={FORM_ID}
          repositoryId={repositoryId}
          node={node}
          hideSubmit
          onSaved={() => onOpenChange(false)}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pending}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
