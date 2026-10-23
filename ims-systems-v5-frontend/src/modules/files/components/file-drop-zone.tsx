import { useRef, useState, type DragEvent } from "react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { deleteStoredFile, uploadFileViaHandler } from "../api/files";
import { formatFileSize } from "../lib/file-preview";
import type { FileMetaInfo } from "../types";

type StagedEntry = {
  id: string;
  fileName: string;
  sizeBytes: number;
  progress: number;
  status: "uploading" | "done" | "error" | "removing";
  meta?: FileMetaInfo;
  error?: string;
};

type FileDropZoneProps = {
  /** Logical upload path sent to the File Handler (x-file-path). */
  path?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Called after each file is stored; parent saves meta on its record. */
  onUploaded?: (meta: FileMetaInfo, file: File) => void;
  /** Called after a staged upload was deleted from storage. */
  onRemoved?: (meta: FileMetaInfo) => void;
};

let nextId = 0;

/**
 * Standard drop zone (spec §8): drag-and-drop or click to select,
 * uploads immediately via File Handler with a progress bar, staged
 * files can be removed (deletes the stored object) before the parent
 * record is saved.
 */
export function FileDropZone({
  path = "general",
  accept,
  multiple = true,
  disabled = false,
  onUploaded,
  onRemoved,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<StagedEntry[]>([]);
  const [dragging, setDragging] = useState(false);

  function patchEntry(id: string, patch: Partial<StagedEntry>) {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
    );
  }

  async function uploadOne(file: File) {
    const id = `staged-${++nextId}`;
    setEntries((current) => [
      ...current,
      {
        id,
        fileName: file.name,
        sizeBytes: file.size,
        progress: 0,
        status: "uploading",
      },
    ]);
    try {
      const meta = await uploadFileViaHandler(file, path, {
        onProgress: (percent) => patchEntry(id, { progress: percent }),
      });
      patchEntry(id, { progress: 100, status: "done", meta });
      onUploaded?.(meta, file);
    } catch (error) {
      patchEntry(id, {
        status: "error",
        error:
          error instanceof Error ? error.message : "Upload failed",
      });
      notify.fromError(error, `Unable to upload ${file.name}`);
    }
  }

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!multiple && files.length > 1) {
      const [first] = files;
      if (first) await uploadOne(first);
      return;
    }
    for (const file of files) {
      await uploadOne(file);
    }
  }

  async function removeEntry(entry: StagedEntry) {
    if (!entry.meta) {
      setEntries((current) => current.filter((e) => e.id !== entry.id));
      return;
    }
    patchEntry(entry.id, { status: "removing" });
    try {
      await deleteStoredFile({
        key: entry.meta.Key || entry.meta.key,
        bucket: entry.meta.Bucket,
      });
      setEntries((current) => current.filter((e) => e.id !== entry.id));
      if (entry.meta) onRemoved?.(entry.meta);
    } catch (error) {
      patchEntry(entry.id, { status: "done" });
      notify.fromError(error, "Attachment remove failed");
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    if (event.dataTransfer.files.length > 0) {
      void handleFiles(event.dataTransfer.files);
    }
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-4 py-6 text-center transition-colors",
          dragging && "bg-muted/40",
          disabled && "cursor-not-allowed opacity-60"
        )}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && !disabled) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <Upload className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drag &apos;n&apos; drop, or click to select files
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(event) => {
            if (event.target.files) void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center gap-3 rounded-md border border-border-subtle px-3 py-2"
        >
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{entry.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {entry.status === "uploading"
                ? `Uploading… ${entry.progress}%`
                : entry.status === "removing"
                  ? "Removing…"
                  : entry.status === "error"
                    ? (entry.error ?? "Upload failed")
                    : formatFileSize(entry.sizeBytes)}
            </p>
            {entry.status === "uploading" ? (
              <div
                className="mt-1.5 h-1.5 w-full overflow-hidden rounded bg-muted"
                role="progressbar"
                aria-valuenow={entry.progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${entry.progress}%` }}
                />
              </div>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={entry.status === "removing"}
            aria-label={`Remove ${entry.fileName}`}
            onClick={() => void removeEntry(entry)}
          >
            {entry.status === "removing" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
