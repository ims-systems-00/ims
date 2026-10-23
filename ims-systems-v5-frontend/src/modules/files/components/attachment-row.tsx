import { useState } from "react";
import { Download, FileText, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { useDownloadFileMutation } from "../hooks/use-files";
import { formatFileSize } from "../lib/file-preview";
import type { FileMetaInfo } from "../types";
import { FilePreviewModal } from "./file-preview-modal";

type AttachmentRowProps = {
  file: FileMetaInfo;
  /** e.g. "Modified by Jane on 12 Jan 2026" — supplied by the parent module. */
  metaLine?: string;
  sizeBytes?: number;
  onDelete?: (file: FileMetaInfo) => Promise<void> | void;
};

/**
 * Shared attachment row: file icon, clickable name (preview modal),
 * Download button, optional Delete (parent owns persistence; this
 * component only reports the intent via onDelete).
 */
export function AttachmentRow({
  file,
  metaLine,
  sizeBytes,
  onDelete,
}: AttachmentRowProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const downloadMutation = useDownloadFileMutation();

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(file);
    } catch (error) {
      notify.fromError(error, "Attachment remove failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-border-subtle px-3 py-2">
      <FileText className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          className="block max-w-full truncate text-left text-sm font-medium text-foreground underline-offset-2 hover:underline"
          onClick={() => setPreviewOpen(true)}
        >
          {file.Name}
        </button>
        {metaLine || sizeBytes ? (
          <p className="truncate text-xs text-muted-foreground">
            {[metaLine, formatFileSize(sizeBytes)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={downloadMutation.isPending}
        onClick={() =>
          downloadMutation.mutate(file, {
            onError: (error) =>
              notify.fromError(error, "Document download failed"),
          })
        }
      >
        <Download className="size-3.5" />
        Download
      </Button>

      {onDelete ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={deleting}
          aria-label={`Delete ${file.Name}`}
          onClick={() => void handleDelete()}
        >
          {deleting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
        </Button>
      ) : null}

      <FilePreviewModal
        file={file}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
