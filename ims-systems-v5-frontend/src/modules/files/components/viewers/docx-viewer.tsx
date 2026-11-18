import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { renderAsync } from "docx-preview";
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { fetchPreviewBytes } from "../../lib/fetch-preview-bytes";

type DocxViewerProps = {
  url: string;
  fileName: string;
  fill?: boolean;
};

export function DocxViewer({ url, fileName, fill = false }: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const bytesQuery = useQuery({
    queryKey: ["files", "preview-bytes", url],
    queryFn: () => fetchPreviewBytes(url),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !bytesQuery.data) return;

    let cancelled = false;
    setRenderError(null);
    el.innerHTML = "";

    void renderAsync(bytesQuery.data, el, undefined, {
      className: "ims-docx-preview",
      inWrapper: true,
      ignoreWidth: false,
      breakPages: true,
    })
      .then(() => {
        if (cancelled) el.innerHTML = "";
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setRenderError(
          err instanceof Error ? err.message : `Unable to preview ${fileName}`
        );
      });

    return () => {
      cancelled = true;
      el.innerHTML = "";
    };
  }, [bytesQuery.data, fileName]);

  if (bytesQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading document…
      </div>
    );
  }

  if (bytesQuery.isError || renderError) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
        {renderError ||
          (bytesQuery.error instanceof Error
            ? bytesQuery.error.message
            : `Unable to preview ${fileName}`)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-auto bg-muted/20 p-4",
        fill ? "h-full" : "min-h-[32rem]"
      )}
    >
      <div
        ref={containerRef}
        className="mx-auto max-w-[860px] rounded-md bg-white p-4 shadow-sm [&_.ims-docx-preview]:text-foreground"
      />
    </div>
  );
}
