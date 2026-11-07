import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { createViewUrl, uploadFileViaHandler } from "../api/files";
import type { FileMetaInfo } from "../types";

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

type ImageUploadControlProps = {
  imageUrl?: string | null;
  alt: string;
  /** Shown when there is no image (e.g. initials). */
  fallbackLabel?: string;
  shape?: "circle" | "rounded";
  tileClassName?: string;
  /** File Handler logical path (x-file-path). */
  uploadPath?: string;
  uploadLabel?: string;
  changeLabel?: string;
  disabled?: boolean;
  onUploaded: (meta: FileMetaInfo, viewUrl: string) => void | Promise<void>;
  onRemove?: () => void | Promise<void>;
};

/**
 * Upload a profile picture / organisation logo via the File Handler,
 * then hand the stored meta + a fresh view URL to the parent so it can
 * persist bucket/key/url on the owning record (user / organisation).
 */
export function ImageUploadControl({
  imageUrl,
  alt,
  fallbackLabel,
  shape = "circle",
  tileClassName = "size-14 text-base",
  uploadPath = "profile",
  uploadLabel = "Upload photo",
  changeLabel = "Change photo",
  disabled = false,
  onUploaded,
  onRemove,
}: ImageUploadControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"idle" | "uploading" | "saving" | "removing">(
    "idle"
  );
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setPreviewUrl(null);
  }, [imageUrl]);

  const shownUrl = previewUrl ?? imageUrl ?? null;
  const isBusy = busy !== "idle";

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      notify.error("Please choose an image file (PNG, JPG, SVG, …).");
      return;
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      notify.error("Image must be 5 MB or smaller.");
      return;
    }
    setBusy("uploading");
    setProgress(0);
    const localPreview = URL.createObjectURL(file);
    try {
      const meta = await uploadFileViaHandler(file, uploadPath, {
        onProgress: setProgress,
      });
      // Prefer a signed view URL; fall back to a blob URL so a
      // preview/mint failure cannot discard a successful upload.
      let viewUrl = localPreview;
      try {
        const view = await createViewUrl({
          bucket: meta.Bucket,
          key: meta.Key || meta.key,
          fileName: meta.Name,
        });
        if (view.url && !view.url.startsWith("memory://")) {
          viewUrl = view.url;
          URL.revokeObjectURL(localPreview);
        }
      } catch {
        // Keep localPreview — bytes are already stored.
      }
      setPreviewUrl(viewUrl);
      setBusy("saving");
      await onUploaded(meta, viewUrl);
    } catch (error) {
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);
      notify.error(
        error instanceof Error ? error.message : "Image upload failed."
      );
    } finally {
      setBusy("idle");
      setProgress(0);
    }
  }

  async function handleRemove() {
    if (!onRemove) return;
    setBusy("removing");
    try {
      await onRemove();
      setPreviewUrl(null);
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not remove the image."
      );
    } finally {
      setBusy("idle");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-primary/10 font-semibold text-primary",
          shape === "circle" ? "rounded-full" : "rounded-xl border",
          tileClassName
        )}
      >
        {shownUrl ? (
          <img src={shownUrl} alt={alt} className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center">
            {fallbackLabel ?? ""}
          </span>
        )}
        {isBusy ? (
          <span className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="size-5 animate-spin" aria-hidden />
          </span>
        ) : null}
      </div>

      <div className="flex flex-col items-start gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || isBusy}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="size-4" aria-hidden />
            {shownUrl ? changeLabel : uploadLabel}
          </Button>
          {onRemove && shownUrl ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={disabled || isBusy}
              onClick={() => void handleRemove()}
            >
              <Trash2 className="size-4" aria-hidden />
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {busy === "uploading"
            ? `Uploading… ${progress}%`
            : busy === "saving"
              ? "Saving…"
              : "PNG, JPG or SVG, up to 5 MB"}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label={uploadLabel}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
