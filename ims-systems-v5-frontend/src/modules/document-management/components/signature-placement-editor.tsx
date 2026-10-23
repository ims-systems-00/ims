import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PenLine,
  Plus,
  X,
} from "lucide-react";
// pdf.js is loaded lazily inside an effect (type-only import here):
// both pdfjs-dist builds ship top-level await, so a static import makes
// the whole chunk fail to load if the bundler/optimiser rejects it —
// which previously white-screened the app when this editor opened.
// Dynamic import + try/catch means a pdf.js failure only degrades this
// editor to its "could not load" notice, never the page.
import type * as PdfJs from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";
import { useFileViewUrlQuery } from "@/modules/files";
import type { DocumentFileMeta, SignatureLocation } from "../types";

type SignaturePlacementEditorProps = {
  value: SignatureLocation[];
  onChange: (locations: SignatureLocation[]) => void;
  /** Stored file to render for visual placement (PDF only). */
  file?: DocumentFileMeta | null;
};

/** Signature box size as a fraction of the rendered page (V4: ~140×70px). */
const MARKER_WIDTH_FRACTION = 0.26;
const MARKER_HEIGHT_PX = 64;

type DragState = {
  index: number;
  offsetX: number;
  offsetY: number;
};

/**
 * Visual signature placement (inspired by the V4 SignaturePlacePicker):
 * the PDF page is rendered on a canvas and signature boxes are dragged
 * directly on it. Positions are stored as relative top-left coordinates
 * (0..1) per page — the backend stamps the signature block at exactly
 * those locations when a signer signs.
 */
export function SignaturePlacementEditor({
  value,
  onChange,
  file,
}: SignaturePlacementEditorProps) {
  const viewQuery = useFileViewUrlQuery(file ?? undefined, Boolean(file));
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const [pdf, setPdf] = useState<PdfJs.PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(1);
  const [page, setPage] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const viewUrl = viewQuery.data?.url;
  const isPdf = /\.pdf$/i.test(file?.Name ?? "");

  // Load the PDF bytes through the signed (inline) view URL.
  useEffect(() => {
    if (!isPdf || !viewUrl || viewUrl.startsWith("memory://")) return;
    let cancelled = false;
    setLoadError(null);
    setPdf(null);

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        const response = await fetch(viewUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.arrayBuffer();
        const doc = await pdfjs.getDocument({ data }).promise;
        if (cancelled) {
          void doc.destroy();
          return;
        }
        setPdf(doc);
        setNumPages(doc.numPages);
        setPage(1);
      } catch {
        if (!cancelled) {
          setLoadError("Could not load this PDF for placement.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPdf, viewUrl]);

  // Track the rendered page width so the canvas stays crisp.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setContainerWidth(Math.floor(width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Render the current page.
  useEffect(() => {
    if (!pdf || !canvasRef.current || containerWidth === 0) return;
    let cancelled = false;

    (async () => {
      try {
        const pdfPage = await pdf.getPage(page);
        if (cancelled || !canvasRef.current) return;
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const scale = containerWidth / baseViewport.width;
        const viewport = pdfPage.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        renderTaskRef.current?.cancel();
        const task = pdfPage.render({ canvasContext: context, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch {
        // Render cancelled (page change) or failed — canvas keeps last frame.
      }
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pdf, page, containerWidth]);

  function pageMarkers() {
    return value
      .map((location, index) => ({ location, index }))
      .filter((entry) => entry.location.page === page);
  }

  function clampLocation(
    x: number,
    y: number,
    rect: DOMRect
  ): { x: number; y: number } {
    const markerHeightFraction = MARKER_HEIGHT_PX / rect.height;
    return {
      x: Math.min(Math.max(0, x), 1 - MARKER_WIDTH_FRACTION),
      y: Math.min(Math.max(0, y), Math.max(0, 1 - markerHeightFraction)),
    };
  }

  function handleMarkerPointerDown(
    event: React.PointerEvent,
    index: number
  ) {
    const container = containerRef.current;
    if (!container) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = container.getBoundingClientRect();
    const location = value[index];
    if (!location) return;
    setSelectedIndex(index);
    setDrag({
      index,
      offsetX: (event.clientX - rect.left) / rect.width - location.x,
      offsetY: (event.clientY - rect.top) / rect.height - location.y,
    });
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!drag || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const next = clampLocation(
      (event.clientX - rect.left) / rect.width - drag.offsetX,
      (event.clientY - rect.top) / rect.height - drag.offsetY,
      rect
    );
    onChange(
      value.map((location, index) =>
        index === drag.index ? { ...location, ...next } : location
      )
    );
  }

  function handlePageClick(event: React.MouseEvent) {
    // Click-to-place: move the selected box (or drop a new one) here.
    const container = containerRef.current;
    if (!container || drag) return;
    const rect = container.getBoundingClientRect();
    const next = clampLocation(
      (event.clientX - rect.left) / rect.width - MARKER_WIDTH_FRACTION / 2,
      (event.clientY - rect.top) / rect.height - 0.03,
      rect
    );
    if (selectedIndex !== null && value[selectedIndex]?.page === page) {
      onChange(
        value.map((location, index) =>
          index === selectedIndex ? { ...location, ...next } : location
        )
      );
      return;
    }
    const created = { page, ...next };
    onChange([...value, created]);
    setSelectedIndex(value.length);
  }

  function addLocation() {
    const created: SignatureLocation = { page, x: 0.08, y: 0.72 };
    onChange([...value, created]);
    setSelectedIndex(value.length);
  }

  function removeLocation(index: number) {
    onChange(value.filter((_, i) => i !== index));
    setSelectedIndex(null);
  }

  if (!file) {
    return (
      <PlacementNotice message="No file is available for this document, so signature positions cannot be placed." />
    );
  }

  if (!isPdf) {
    return (
      <PlacementNotice message="Visual signature placement is available for PDF documents. This file cannot be stamped yet — please upload a PDF version to request signatures." />
    );
  }

  const loading = viewQuery.isLoading || (viewUrl && !pdf && !loadError);
  const markers = pageMarkers();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Page</span>
            <Input
              type="number"
              min={1}
              max={numPages}
              className="h-7 w-14 px-1.5 text-center"
              value={page}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isFinite(next)) {
                  setPage(Math.min(numPages, Math.max(1, next)));
                }
              }}
            />
            <span>of {numPages}</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="Next page"
            disabled={page >= numPages}
            onClick={() =>
              setPage((current) => Math.min(numPages, current + 1))
            }
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>

        <Button type="button" size="sm" variant="outline" onClick={addLocation}>
          <Plus className="size-3.5" />
          Add signature box
        </Button>
      </div>

      <div
        ref={containerRef}
        data-testid="signature-page"
        className="relative w-full touch-none select-none overflow-hidden rounded-md border border-border-subtle bg-white shadow-sm"
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDrag(null)}
        onClick={handlePageClick}
      >
        <canvas ref={canvasRef} className="block h-auto w-full" />

        {loading ? (
          <div className="absolute inset-0 flex min-h-64 items-center justify-center gap-2 bg-white/80 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading document…
          </div>
        ) : null}

        {loadError ? (
          <div className="absolute inset-0 flex min-h-64 items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {loadError} You can still send the request — positions already
            added below will be used.
          </div>
        ) : null}

        {markers.map(({ location, index }) => (
          <div
            key={index}
            role="button"
            aria-label={`Signature box ${index + 1} on page ${location.page}`}
            className={cn(
              "absolute flex cursor-grab items-center justify-center gap-1.5 rounded border-2 text-[0.7rem] font-semibold uppercase tracking-wide active:cursor-grabbing",
              selectedIndex === index
                ? "border-primary bg-primary/20 text-primary"
                : "border-sky-600 bg-sky-500/15 text-sky-700"
            )}
            style={{
              left: `${location.x * 100}%`,
              top: `${location.y * 100}%`,
              width: `${MARKER_WIDTH_FRACTION * 100}%`,
              height: `${MARKER_HEIGHT_PX}px`,
            }}
            onPointerDown={(event) => handleMarkerPointerDown(event, index)}
          >
            <PenLine className="size-3.5" />
            Signature {index + 1}
            <button
              type="button"
              aria-label={`Remove signature box ${index + 1}`}
              className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                removeLocation(index);
              }}
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
      </div>

      <p className="text-[0.7rem] text-muted-foreground">
        Drag a signature box to exactly where the signer should sign — or
        click anywhere on the page to place the selected box there. The
        signed PDF is stamped at these positions.
      </p>

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((location, index) => (
            <li
              key={index}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs",
                location.page === page
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <button
                type="button"
                onClick={() => {
                  setPage(location.page);
                  setSelectedIndex(index);
                }}
              >
                #{index + 1} · Page {location.page} ·{" "}
                {Math.round(location.x * 100)}%, {Math.round(location.y * 100)}%
              </button>
              <button
                type="button"
                aria-label={`Remove signature box ${index + 1}`}
                onClick={() => removeLocation(index)}
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-border-subtle px-3 py-2.5 text-[0.75rem] text-muted-foreground">
          No signature boxes yet — add one and drag it into position.
        </p>
      )}
    </div>
  );
}

function PlacementNotice({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-[0.75rem] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
