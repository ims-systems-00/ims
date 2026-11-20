import { Download, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/shared/lib/utils";
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
 * Covers the entire viewport above sheets/dialogs, with a clear close control.
 */
export function FilePreviewModal({
  file,
  open,
  onOpenChange,
}: FilePreviewModalProps) {
  const downloadMutation = useDownloadFileMutation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[70] bg-background/80" />
        <DialogPrimitive.Content
          data-dialog-layer
          aria-describedby={undefined}
          className={cn(
            "fixed inset-0 left-0 top-0 z-[70] flex h-dvh w-screen flex-col gap-0 overflow-hidden bg-background p-0 shadow-none outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
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
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
