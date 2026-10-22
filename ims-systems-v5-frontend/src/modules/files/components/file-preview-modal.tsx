import { Download } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
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

/** Full-screen-ish preview modal used from attachment rows (spec §8). */
export function FilePreviewModal({
  file,
  open,
  onOpenChange,
}: FilePreviewModalProps) {
  const downloadMutation = useDownloadFileMutation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="flex-row items-center justify-between border-b border-border-subtle px-4 py-3 pr-12">
          <DialogTitle className="min-w-0 truncate">
            {file?.Name ?? "File preview"}
          </DialogTitle>
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
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col bg-muted/20">
          {file ? <FilePreview file={file} /> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
