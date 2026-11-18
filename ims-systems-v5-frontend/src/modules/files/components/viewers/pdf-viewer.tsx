import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// react-pdf 11 ships pdfjs-dist@6; keep the worker version in lockstep via CDN
// so the app's direct pdfjs-dist@4 (signature placement) is unaffected.
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type PdfViewerProps = {
  url: string;
  fileName: string;
  fill?: boolean;
};

export function PdfViewer({ url, fileName, fill = false }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col bg-muted/30",
        fill ? "h-full" : "min-h-[32rem]"
      )}
    >
      <div className="flex shrink-0 items-center justify-center gap-2 border-b border-border-subtle bg-surface px-3 py-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={page <= 1}
          aria-label="Previous page"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          <ChevronLeft />
        </Button>
        <span className="min-w-[6rem] text-center text-xs text-muted-foreground">
          {numPages > 0 ? `Page ${page} / ${numPages}` : "—"}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={numPages === 0 || page >= numPages}
          aria-label="Next page"
          onClick={() => setPage((p) => Math.min(numPages, p + 1))}
        >
          <ChevronRight />
        </Button>
        <div className="mx-2 h-4 w-px bg-border" />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Zoom out"
          disabled={scale <= 0.5}
          onClick={() => setScale((s) => Math.max(0.5, Math.round((s - 0.1) * 10) / 10))}
        >
          <ZoomOut />
        </Button>
        <span className="min-w-[3rem] text-center text-xs text-muted-foreground">
          {Math.round(scale * 100)}%
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Zoom in"
          disabled={scale >= 2.5}
          onClick={() => setScale((s) => Math.min(2.5, Math.round((s + 0.1) * 10) / 10))}
        >
          <ZoomIn />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 justify-center overflow-auto p-4">
        <Document
          file={url}
          loading={
            <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading PDF…
            </div>
          }
          error={
            <div className="p-8 text-center text-sm text-muted-foreground">
              Unable to preview {fileName}.
            </div>
          }
          onLoadSuccess={({ numPages: next }) => {
            setNumPages(next);
            setPage(1);
          }}
        >
          <Page
            pageNumber={page}
            scale={scale}
            className="shadow-sm"
            loading={
              <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Rendering page…
              </div>
            }
          />
        </Document>
      </div>
    </div>
  );
}
