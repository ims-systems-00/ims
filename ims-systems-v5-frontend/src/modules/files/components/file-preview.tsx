import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { isApiClientError } from "@/shared/lib/http";
import { useDownloadFileMutation, useFileViewUrlQuery } from "../hooks/use-files";
import {
  buildOfficeViewerUrl,
  getFilePreviewKind,
} from "../lib/file-preview";
import type { FileMetaInfo } from "../types";

/**
 * Shared in-app preview body: PDF viewer, inline image, Office Online
 * embed, or an unsupported fallback with a download action.
 * Used by the preview modal and embedded preview panels.
 */
export function FilePreview({ file }: { file: FileMetaInfo }) {
  const viewQuery = useFileViewUrlQuery(file);
  const downloadMutation = useDownloadFileMutation();
  const [officeLoaded, setOfficeLoaded] = useState(false);

  const kind = getFilePreviewKind(file.Name);
  const url = viewQuery.data?.url;
  const isMemory = url?.startsWith("memory://");

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
    const previewHint = isMemory
      ? "File storage is in memory mode (no real bytes). Set FILES_ENABLED=true with FILES_PROVIDER=local or s3, restart the API, then re-upload."
      : ephemeralGone
        ? "This file was uploaded with ephemeral in-memory storage and is no longer available. Re-upload the document to preview it."
        : "Preview unavailable for this file.";
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
        className="min-h-[32rem] w-full flex-1 border-0 bg-white"
      />
    );
  }

  if (kind === "image") {
    return (
      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
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
    return (
      <div className="relative flex flex-1 flex-col">
        {!officeLoaded ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Preparing your document…
          </div>
        ) : null}
        <iframe
          title={`Preview of ${file.Name}`}
          src={buildOfficeViewerUrl(url)}
          className="min-h-[32rem] w-full flex-1 border-0 bg-white"
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
