import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import { Loader2 } from "lucide-react";
import { usePreviewBytesQuery } from "../../lib/fetch-preview-bytes";

type DocxViewerProps = {
  url: string;
  fileName: string;
  fill?: boolean;
};

/**
 * In-browser DOCX preview via docx-preview.
 * Used when Microsoft Office Online cannot reach the signed URL
 * (localhost / private networks / docker).
 */
export function DocxViewer({ url, fileName, fill = false }: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bytesQuery = usePreviewBytesQuery(url, fileName);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    const buffer = bytesQuery.data;
    if (!el || !buffer) return;

    let cancelled = false;
    setRenderError(null);
    setRendering(true);
    el.innerHTML = "";

    void renderAsync(buffer, el, undefined, {
      className: "ims-docx-preview",
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
      renderHeaders: true,
      renderFooters: true,
    })
      .then(() => {
        if (!cancelled) setRendering(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setRendering(false);
        setRenderError(
          error instanceof Error ? error.message : "Unable to render this DOCX"
        );
      });

    return () => {
      cancelled = true;
      el.innerHTML = "";
    };
  }, [bytesQuery.data]);

  if (bytesQuery.isLoading || rendering) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Preparing your document…
      </div>
    );
  }

  if (bytesQuery.isError || renderError) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
        {renderError ||
          (bytesQuery.error instanceof Error
            ? bytesQuery.error.message
            : "Preview unavailable for this file.")}
      </div>
    );
  }

  return (
    <div
      className={
        fill
          ? "h-full min-h-0 flex-1 overflow-auto bg-muted/30 p-4"
          : "min-h-[32rem] flex-1 overflow-auto bg-muted/30 p-4"
      }
    >
      <div
        ref={containerRef}
        className="mx-auto max-w-[816px] rounded-sm bg-white shadow-sm [&_.ims-docx-preview]:bg-white"
      />
    </div>
  );
}
