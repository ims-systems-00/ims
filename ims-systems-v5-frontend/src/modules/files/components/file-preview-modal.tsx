import { Download, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useDownloadFileMutation } from "../hooks/use-files";
import type { FileMetaInfo } from "../types";
import { FilePreview } from "./file-preview";

type FilePreviewModalProps = {
  file: FileMetaInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * True full-screen file preview (document Expand preview + attachment rows).
 * Covers the entire viewport with a clear close control.
 */
export function FilePreviewModal({
  file,
  open,
  onOpenChange,
}: FilePreviewModalProps) {
  const downloadMutation = useDownloadFileMutation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        className="fixed inset-0 left-0 top-0 z-50 flex h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 shadow-none"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-subtle bg-surface-elevated px-4 py-3">
          <DialogTitle className="min-w-0 truncate text-base font-semibold">
            {file?.Name ?? "File preview"}
          </DialogTitle>
          <div className="flex shrink-0 items-center gap-2">
            {file ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={downloadMutation.isPending}
                onClick={() => downloadMutation.mutate(file)}
              >
                <Download className="size-3.5" />
                Download
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              aria-label="Close full-screen preview"
              title="Close"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
              Close
            </Button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col bg-muted/20">
          {file ? <FilePreview file={file} fill /> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
