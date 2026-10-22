import { useState } from "react";
import { Download, Expand, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  FilePreview,
  FilePreviewModal,
  getFilePreviewKind,
  useDownloadFileMutation,
  useFileViewUrlQuery,
  type FilePreviewKind,
} from "@/modules/files";
import type { DocumentFileMeta } from "../types";

type DocumentPreviewPanelProps = {
  storageInfo: DocumentFileMeta | null | undefined;
  title: string;
};

const KIND_LABELS: Record<FilePreviewKind, string> = {
  pdf: "PDF",
  image: "Image",
  office: "Office document",
  text: "Text",
  unsupported: "File",
};

/**
 * In-app document preview panel (document detail page). Delegates the
 * rendering to the shared File Handler preview: PDF inline, images,
 * Office Online embed, plain-text inline, download fallback otherwise.
 * The signed view URL comes from the File Handler API (org-bucket gated).
 */
export function DocumentPreviewPanel({
  storageInfo,
  title,
}: DocumentPreviewPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const fileName = storageInfo?.Name || title;
  const hasFile = Boolean(storageInfo?.Bucket && storageInfo.Key);
  const kind = getFilePreviewKind(fileName);

  const viewQuery = useFileViewUrlQuery(storageInfo, hasFile);
  const downloadMutation = useDownloadFileMutation();
  const viewUrl = viewQuery.data?.url;
  const canOpenExternal = Boolean(viewUrl && !viewUrl.startsWith("memory://"));

  function openExternal() {
    if (!viewUrl) return;
    window.open(viewUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex min-h-[28rem] flex-col overflow-hidden rounded-md border border-border-subtle bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <p className="truncate text-[0.8125rem] font-medium">{fileName}</p>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
            {KIND_LABELS[kind]}
          </span>
        </div>

        {hasFile && storageInfo ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label="Open preview in a new tab"
              title="Open in new tab"
              disabled={!canOpenExternal}
              onClick={openExternal}
            >
              <ExternalLink className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label="Expand preview"
              title="Expand preview"
              onClick={() => setExpanded(true)}
            >
              <Expand className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label="Download file"
              title="Download"
              disabled={downloadMutation.isPending}
              onClick={() =>
                downloadMutation.mutate(storageInfo, {
                  onError: () =>
                    notify.error("Could not download this file"),
                })
              }
            >
              <Download className="size-3.5" />
            </Button>
          </div>
        ) : null}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col bg-muted/20">
        {hasFile && storageInfo ? (
          <FilePreview file={storageInfo} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-[0.8125rem] text-muted-foreground">
            File metadata missing for this document.
          </div>
        )}
      </div>

      {storageInfo ? (
        <FilePreviewModal
          file={storageInfo}
          open={expanded}
          onOpenChange={setExpanded}
        />
      ) : null}
    </div>
  );
}
