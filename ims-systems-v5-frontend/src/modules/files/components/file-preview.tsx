import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { isApiClientError } from "@/shared/lib/http";
import { useDownloadFileMutation, useFileViewUrlQuery } from "../hooks/use-files";
import {
  buildOfficeViewerUrl,
  getFileExtension,
  getFilePreviewKind,
  isOfficeOnlineCompatibleUrl,
} from "../lib/file-preview";
import type { FileMetaInfo } from "../types";
import { DocxViewer } from "./viewers/docx-viewer";

type FilePreviewProps = {
  file: FileMetaInfo;
  /** Stretch preview to fill the parent (full-screen modal). */
  fill?: boolean;
};

/**
 * Shared in-app preview body: PDF viewer, inline image, Office Online
 * embed, or an unsupported fallback with a download action.
 * Used by the preview modal and embedded preview panels.
 */
export function FilePreview({ file, fill = false }: FilePreviewProps) {
  const viewQuery = useFileViewUrlQuery(file);
  const downloadMutation = useDownloadFileMutation();
  const [officeLoaded, setOfficeLoaded] = useState(false);

  const kind = getFilePreviewKind(file.Name);
  const url = viewQuery.data?.url;
  const isMemory = url?.startsWith("memory://");
  const frameClass = fill
    ? "h-full min-h-0 w-full flex-1 border-0 bg-white"
    : "min-h-[32rem] w-full flex-1 border-0 bg-white";

  if (viewQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {kind === "office" ? "Preparing your document…" : "Loading preview…"}
      </div>
    );
  }

  if (viewQuery.isError || !url || isMemory) {
    const ephemeralGone =
      isApiClientError(viewQuery.error) &&
      (viewQuery.error.code === "FILES_EPHEMERAL_GONE" ||
        viewQuery.error.status === 410);
    const apiMessage =
      isApiClientError(viewQuery.error) && viewQuery.error.message
        ? viewQuery.error.message
        : null;
    const forbiddenBucket =
      isApiClientError(viewQuery.error) &&
      (viewQuery.error.status === 403 ||
        /bucket does not belong/i.test(apiMessage ?? ""));
    const previewHint = isMemory
      ? "File storage is in memory mode (no real bytes). Set FILES_ENABLED=true with FILES_PROVIDER=local or s3, restart the API, then re-upload."
      : ephemeralGone
        ? "This file was uploaded with ephemeral in-memory storage and is no longer available. Re-upload the document to preview it."
        : forbiddenBucket
          ? "This file is in a V4 storage bucket that is not readable with the current file settings. Configure AWS_LEGACY_* credentials (or FILES_PROVIDER=s3) for migrated documents, or re-upload the file."
          : apiMessage || "Preview unavailable for this file.";
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="max-w-sm text-sm text-muted-foreground">
          {previewHint}
        </p>
        <Button
          type="button"
          size="sm"
          disabled={downloadMutation.isPending}
          onClick={() => downloadMutation.mutate(file)}
        >
          <Download className="size-3.5" />
          Download
        </Button>
      </div>
    );
  }

  if (kind === "pdf") {
    return (
      <iframe
        title={`Preview of ${file.Name}`}
        src={url}
        className={frameClass}
      />
    );
  }

  if (kind === "image") {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center overflow-auto p-4">
        <img
          src={url}
          alt={file.Name}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }

  if (kind === "text") {
    return <TextFilePreview url={url} fileName={file.Name} />;
  }

  if (kind === "office") {
    const ext = getFileExtension(file.Name);
    // Office Online cannot fetch localhost/private signed URLs — use
    // in-browser docx-preview for .docx in those environments.
    if (ext === "docx" && !isOfficeOnlineCompatibleUrl(url)) {
      return <DocxViewer url={url} fileName={file.Name} fill={fill} />;
    }

    return (
      <div className="relative flex h-full min-h-0 flex-1 flex-col">
        {!officeLoaded ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-muted/20 p-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Preparing your document…
          </div>
        ) : null}
        <iframe
          title={`Preview of ${file.Name}`}
          src={buildOfficeViewerUrl(url)}
          className={frameClass}
          onLoad={() => setOfficeLoaded(true)}
        />
      </div>
    );
  }

  return <UnsupportedPreview file={file} />;
}

const MAX_TEXT_PREVIEW_CHARS = 100_000;

/** Inline preview for plain-text-like files (txt/md/log/json/…). */
function TextFilePreview({ url, fileName }: { url: string; fileName: string }) {
  const textQuery = useQuery({
    queryKey: ["files", "text-preview", url],
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Unable to load ${fileName} (${response.status})`);
      }
      return response.text();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (textQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading preview…
      </div>
    );
  }

  if (textQuery.isError || textQuery.data === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
        Preview unavailable for this file.
      </div>
    );
  }

  const truncated = textQuery.data.length > MAX_TEXT_PREVIEW_CHARS;
  const text = truncated
    ? textQuery.data.slice(0, MAX_TEXT_PREVIEW_CHARS)
    : textQuery.data;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[0.75rem] leading-relaxed text-foreground">
        {text}
      </pre>
      {truncated ? (
        <p className="border-t border-border-subtle px-4 py-2 text-[0.6875rem] text-muted-foreground">
          Preview truncated — download the file to see the full content.
        </p>
      ) : null}
    </div>
  );
}

function UnsupportedPreview({
  file,
}: {
  file: FileMetaInfo;
}) {
  const downloadMutation = useDownloadFileMutation();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="max-w-sm text-sm text-muted-foreground">
        Preview unavailable for this file type.
      </p>
      <Button
        type="button"
        size="sm"
        disabled={downloadMutation.isPending}
        onClick={() => downloadMutation.mutate(file)}
      >
        <Download className="size-3.5" />
        Download
      </Button>
    </div>
  );
}
