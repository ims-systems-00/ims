import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Image as ImageIcon,
  Paperclip,
  Loader2,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { notify } from "@/shared/lib/toast";
import {
  createViewUrl,
  uploadFileViaHandler,
} from "@/modules/files/api/files";
import { escapeHtml, normalizeActivityHtml } from "../lib/activity-html";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const UPLOAD_PATH = "activities";

type ComposerProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeightClassName?: string;
};

function attr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

/**
 * Lightweight activity composer: contentEditable + native bold/italic/underline
 * and File Handler uploads. No TipTap / ProseMirror.
 */
export function ActivityComposer({
  value,
  onChange,
  placeholder = "Write a comment…",
  disabled = false,
  className,
  minHeightClassName = "min-h-[7.5rem]",
}: ComposerProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef(value);
  const seeded = useRef(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const root = editorRef.current;
    if (!root) return;
    if (!seeded.current) {
      root.innerHTML = normalizeActivityHtml(value);
      lastEmitted.current = value;
      seeded.current = true;
      return;
    }
    if (value === lastEmitted.current) return;
    root.innerHTML = normalizeActivityHtml(value);
    lastEmitted.current = value;
  }, [value]);

  function emitFromDom() {
    const root = editorRef.current;
    if (!root) return;
    const html = root.innerHTML;
    lastEmitted.current = html;
    onChange(html);
  }

  function runCommand(command: string) {
    if (disabled) return;
    editorRef.current?.focus();
    try {
      document.execCommand(command, false);
    } catch {
      /* ignore unsupported commands */
    }
    emitFromDom();
  }

  function insertHtml(html: string) {
    if (disabled) return;
    editorRef.current?.focus();
    try {
      document.execCommand("insertHTML", false, html);
    } catch {
      const root = editorRef.current;
      if (root) root.insertAdjacentHTML("beforeend", html);
    }
    emitFromDom();
  }

  async function handleFiles(
    files: FileList | File[],
    mode: "image" | "file" | "auto"
  ) {
    if (disabled) return;
    const list = [...files];
    if (!list.length) return;
    setUploading(true);
    try {
      for (const file of list) {
        const asImage =
          mode === "image" ||
          (mode === "auto" && file.type.startsWith("image/"));

        if (asImage) {
          if (!file.type.startsWith("image/")) {
            notify.error("Please choose an image file");
            continue;
          }
          if (file.size > MAX_IMAGE_BYTES) {
            notify.error("Images must be 5 MB or smaller");
            continue;
          }
          const meta = await uploadFileViaHandler(file, UPLOAD_PATH);
          const key = meta.Key || meta.key;
          let viewUrl = "";
          try {
            const view = await createViewUrl({
              bucket: meta.Bucket,
              key,
              fileName: meta.Name,
            });
            viewUrl = view.url;
          } catch {
            viewUrl = "";
          }
          const name = meta.Name || file.name;
          insertHtml(
            `<img src="${attr(viewUrl)}" alt="${attr(name)}" data-bucket="${attr(meta.Bucket)}" data-key="${attr(key)}" data-name="${attr(name)}" class="max-h-56 max-w-full rounded-md border border-border-subtle object-contain" />`
          );
        } else {
          if (file.size > MAX_FILE_BYTES) {
            notify.error("Files must be 15 MB or smaller");
            continue;
          }
          const meta = await uploadFileViaHandler(file, UPLOAD_PATH);
          const key = meta.Key || meta.key;
          const name = meta.Name || file.name;
          insertHtml(
            `<a href="#" class="activity-file-attachment" data-bucket="${attr(meta.Bucket)}" data-key="${attr(key)}" data-name="${attr(name)}">📎 ${escapeHtml(name)}</a>&nbsp;`
          );
        }
      }
    } catch (error) {
      notify.fromError(error, "Could not upload attachment");
    } finally {
      setUploading(false);
    }
  }

  function onImagePick(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    event.target.value = "";
    if (files?.length) void handleFiles(files, "image");
  }

  function onFilePick(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    event.target.value = "";
    if (files?.length) void handleFiles(files, "file");
  }

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-background",
        disabled && "opacity-60",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border-subtle px-1 py-1">
        <ToolButton
          label="Bold"
          disabled={disabled || uploading}
          onClick={() => runCommand("bold")}
        >
          <Bold className="size-3.5" aria-hidden />
        </ToolButton>
        <ToolButton
          label="Italic"
          disabled={disabled || uploading}
          onClick={() => runCommand("italic")}
        >
          <Italic className="size-3.5" aria-hidden />
        </ToolButton>
        <ToolButton
          label="Underline"
          disabled={disabled || uploading}
          onClick={() => runCommand("underline")}
        >
          <UnderlineIcon className="size-3.5" aria-hidden />
        </ToolButton>
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        <ToolButton
          label="Attach image"
          disabled={disabled || uploading}
          onClick={() => imageInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <ImageIcon className="size-3.5" aria-hidden />
          )}
        </ToolButton>
        <ToolButton
          label="Attach file"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="size-3.5" aria-hidden />
        </ToolButton>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled || uploading}
          onChange={onImagePick}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          disabled={disabled || uploading}
          onChange={onFilePick}
        />
      </div>

      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-label="Comment"
        aria-placeholder={placeholder}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={cn(
          "activity-editor-prose px-3 py-2 text-sm outline-none empty:before:pointer-events-none empty:before:float-left empty:before:h-0 empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
          minHeightClassName
        )}
        onInput={emitFromDom}
        onBlur={emitFromDom}
        onPaste={(event) => {
          const files = event.clipboardData?.files;
          if (!files?.length) return;
          const images = [...files].filter((file) =>
            file.type.startsWith("image/")
          );
          if (!images.length) return;
          event.preventDefault();
          void handleFiles(images, "image");
        }}
        onDrop={(event) => {
          const files = event.dataTransfer?.files;
          if (!files?.length) return;
          event.preventDefault();
          void handleFiles([...files], "auto");
        }}
      />
    </div>
  );
}

function ToolButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-7 w-7 px-0"
      disabled={disabled}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
