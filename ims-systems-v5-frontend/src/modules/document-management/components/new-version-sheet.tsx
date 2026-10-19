import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/toast";
import { useSessionSubjectId } from "@/security";
import { uploadFileViaHandler } from "@/modules/files";
import {
  useAddDocumentVersionMutation,
  useRevisePendingDocumentMutation,
} from "../hooks/use-document-management";
import type { DocumentTreeNode } from "../types";

type NewVersionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repositoryId: string;
  node: DocumentTreeNode | null;
  mode: "version" | "revision";
};

export function NewVersionSheet({
  open,
  onOpenChange,
  repositoryId,
  node,
  mode,
}: NewVersionSheetProps) {
  const sessionSubjectId = useSessionSubjectId();
  const versionMutation = useAddDocumentVersionMutation(repositoryId);
  const revisionMutation = useRevisePendingDocumentMutation(repositoryId);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (!node || !file) {
      notify.error("Select a file");
      return;
    }
    setBusy(true);
    try {
      const storageInfo = await uploadFileViaHandler(file, "general");
      if (mode === "revision") {
        await revisionMutation.mutateAsync({
          nodeId: node.id,
          storageInfo,
        });
        notify.success("Pending document revised");
      } else {
        const priorAuthorisers =
          node.documentData?.authorisation?.map((entry) => entry.userId) ?? [];
        await versionMutation.mutateAsync({
          nodeId: node.id,
          parentNodeId: node.parentNodeId,
          storageInfo,
          owners: node.documentData?.owners,
          authorisation:
            priorAuthorisers.length > 0
              ? priorAuthorisers
              : sessionSubjectId
                ? [sessionSubjectId]
                : [],
        });
        notify.success("New version created");
      }
      onOpenChange(false);
      setFile(null);
    } catch (error) {
      notify.fromError(
        error,
        mode === "revision"
          ? "Unable to revise document"
          : "Unable to create new version"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "revision" ? "Revise pending file" : "Upload new version"}
      description={
        node
          ? mode === "revision"
            ? `Replace the file for pending “${node.name}”.`
            : `Create the next version of “${node.name}”.`
          : "Select a document first."
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
            disabled={!node || !file || busy}
            onClick={() => void handleSubmit()}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {mode === "revision" ? "Revise" : "Create version"}
          </Button>
        </div>
      }
    >
      <Input
        type="file"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
    </AppSheet>
  );
}
