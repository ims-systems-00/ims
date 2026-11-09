import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
} from "@tiptap/react";
import type { Editor, NodeViewProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Image as ImageIcon,
  Paperclip,
  Loader2,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { notify } from "@/shared/lib/toast";
import {
  createViewUrl,
  downloadFile,
  uploadFileViaHandler,
} from "@/modules/files/api/files";
import type { FileMetaInfo } from "@/modules/files/types";
import {
  isActivityValueEmpty,
  normalizeActivityHtml,
} from "../lib/activity-html";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const UPLOAD_PATH = "activities";

type UploadMode = "image" | "file" | "auto";

function ActivityImageView(props: NodeViewProps) {
  const { bucket, storageKey, fileName, src, alt } = props.node.attrs as {
    bucket?: string | null;
    storageKey?: string | null;
    fileName?: string | null;
    src?: string | null;
    alt?: string | null;
  };
  const [url, setUrl] = useState<string | null>(src ?? null);

  useEffect(() => {
    if (!bucket || !storageKey) {
      setUrl(src ?? null);
      return;
    }
    let cancelled = false;
    void createViewUrl({
      bucket,
      key: storageKey,
      fileName: fileName ?? undefined,
    })
      .then((view) => {
        if (!cancelled) setUrl(view.url);
      })
      .catch(() => {
        if (!cancelled) setUrl(src ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [bucket, storageKey, fileName, src]);

  return (
    <NodeViewWrapper
      as="figure"
      className="activity-image-node my-2"
      data-drag-handle
    >
      {url ? (
        <img
          src={url}
          alt={alt || fileName || "Attachment"}
          className="max-h-56 max-w-full rounded-md border border-border-subtle object-contain"
        />
      ) : (
        <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
          Loading image…
        </div>
      )}
      {fileName ? (
        <figcaption className="mt-1 text-xs text-muted-foreground">
          {fileName}
        </figcaption>
      ) : null}
    </NodeViewWrapper>
  );
}

const ActivityImage = Image.extend({
  name: "activityImage",
  addAttributes() {
    return {
      ...this.parent?.(),
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      bucket: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-bucket"),
        renderHTML: (attributes) =>
          attributes.bucket ? { "data-bucket": attributes.bucket } : {},
      },
      storageKey: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-key"),
        renderHTML: (attributes) =>
          attributes.storageKey ? { "data-key": attributes.storageKey } : {},
      },
      fileName: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-name"),
        renderHTML: (attributes) =>
          attributes.fileName ? { "data-name": attributes.fileName } : {},
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ActivityImageView);
  },
});

const ActivityLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: { default: null },
      bucket: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-bucket"),
        renderHTML: (attributes) =>
          attributes.bucket ? { "data-bucket": attributes.bucket } : {},
      },
      storageKey: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-key"),
        renderHTML: (attributes) =>
          attributes.storageKey ? { "data-key": attributes.storageKey } : {},
      },
      fileName: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-name"),
        renderHTML: (attributes) =>
          attributes.fileName ? { "data-name": attributes.fileName } : {},
      },
    };
  },
}).configure({
  openOnClick: false,
  HTMLAttributes: {
    class: "text-primary underline underline-offset-2",
  },
});

function buildExtensions(placeholder: string) {
  return [
    // TipTap v3 StarterKit already ships link + underline — disable those
    // so our extended ActivityLink / Underline are not duplicate names.
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      blockquote: false,
      link: false,
      underline: false,
    }),
    Underline,
    ActivityLink,
    ActivityImage.configure({ allowBase64: false }),
    Placeholder.configure({ placeholder }),
  ];
}

async function uploadActivityFile(file: File): Promise<{
  meta: FileMetaInfo;
  viewUrl: string;
}> {
  const meta = await uploadFileViaHandler(file, UPLOAD_PATH);
  let viewUrl = "";
  try {
    const view = await createViewUrl({
      bucket: meta.Bucket,
      key: meta.Key || meta.key,
      fileName: meta.Name,
    });
    viewUrl = view.url;
  } catch {
    viewUrl = "";
  }
  return { meta, viewUrl };
}

function insertUploadedImage(
  editor: Editor,
  file: File,
  meta: FileMetaInfo,
  viewUrl: string
) {
  editor
    .chain()
    .focus()
    .insertContent({
      type: "activityImage",
      attrs: {
        src: viewUrl || null,
        alt: file.name,
        bucket: meta.Bucket,
        storageKey: meta.Key || meta.key,
        fileName: meta.Name || file.name,
      },
    })
    .run();
}

function insertUploadedFile(editor: Editor, file: File, meta: FileMetaInfo) {
  const label = meta.Name || file.name;
  editor
    .chain()
    .focus()
    .insertContent({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: `📎 ${label}`,
          marks: [
            {
              type: "link",
              attrs: {
                href: "#",
                class: "activity-file-attachment",
                bucket: meta.Bucket,
                storageKey: meta.Key || meta.key,
                fileName: label,
              },
            },
          ],
        },
      ],
    })
    .run();
}

type ToolbarProps = {
  editor: Editor;
  disabled?: boolean;
  uploading: boolean;
  onPickImage: () => void;
  onPickFile: () => void;
};

function EditorToolbar({
  editor,
  disabled,
  uploading,
  onPickImage,
  onPickFile,
}: ToolbarProps) {
  const tool = (
    active: boolean,
    onClick: () => void,
    label: string,
    icon: ReactNode
  ) => (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={disabled || uploading}
      aria-label={label}
      aria-pressed={active}
      className={cn("size-8 p-0", active && "bg-muted text-foreground")}
      onClick={onClick}
    >
      {icon}
    </Button>
  );

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border-subtle px-1.5 py-1">
      {tool(
        editor.isActive("bold"),
        () => editor.chain().focus().toggleBold().run(),
        "Bold",
        <Bold className="size-3.5" />
      )}
      {tool(
        editor.isActive("italic"),
        () => editor.chain().focus().toggleItalic().run(),
        "Italic",
        <Italic className="size-3.5" />
      )}
      {tool(
        editor.isActive("underline"),
        () => editor.chain().focus().toggleUnderline().run(),
        "Underline",
        <UnderlineIcon className="size-3.5" />
      )}
      {tool(
        editor.isActive("bulletList"),
        () => editor.chain().focus().toggleBulletList().run(),
        "Bullet list",
        <List className="size-3.5" />
      )}
      {tool(
        editor.isActive("orderedList"),
        () => editor.chain().focus().toggleOrderedList().run(),
        "Numbered list",
        <ListOrdered className="size-3.5" />
      )}
      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
      {tool(
        false,
        onPickImage,
        "Attach image",
        <ImageIcon className="size-3.5" />
      )}
      {tool(
        false,
        onPickFile,
        "Attach file",
        <Paperclip className="size-3.5" />
      )}
      {uploading ? (
        <span className="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Uploading…
        </span>
      ) : null}
    </div>
  );
}

type ActivityRichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeightClassName?: string;
};

export function ActivityRichTextEditor({
  value,
  onChange,
  placeholder = "Write a comment…",
  disabled = false,
  className,
  minHeightClassName = "min-h-[7.5rem]",
}: ActivityRichTextEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const lastEmitted = useRef(value);
  const uploadManyRef = useRef<(files: File[], mode: UploadMode) => Promise<void>>(
    async () => undefined
  );

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editable: !disabled,
    extensions: buildExtensions(placeholder),
    content: normalizeActivityHtml(value) || undefined,
    editorProps: {
      attributes: {
        class: cn(
          "activity-editor-prose px-3 py-2 text-sm outline-none",
          minHeightClassName
        ),
      },
      handlePaste(_view, event) {
        const files = event.clipboardData?.files;
        if (!files?.length) return false;
        const images = [...files].filter((file) =>
          file.type.startsWith("image/")
        );
        if (!images.length) return false;
        event.preventDefault();
        void uploadManyRef.current(images, "image");
        return true;
      },
      handleDrop(_view, event) {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        event.preventDefault();
        void uploadManyRef.current([...files], "auto");
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  const uploadMany = useCallback(
    async (files: File[], mode: UploadMode) => {
      if (!editor || disabled) return;
      setUploading(true);
      try {
        for (const file of files) {
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
            const { meta, viewUrl } = await uploadActivityFile(file);
            insertUploadedImage(editor, file, meta, viewUrl);
          } else {
            if (file.size > MAX_FILE_BYTES) {
              notify.error("Files must be 15 MB or smaller");
              continue;
            }
            const { meta } = await uploadActivityFile(file);
            insertUploadedFile(editor, file, meta);
          }
        }
      } catch (error) {
        notify.fromError(error, "Could not upload attachment");
      } finally {
        setUploading(false);
      }
    },
    [editor, disabled]
  );

  useEffect(() => {
    uploadManyRef.current = uploadMany;
  }, [uploadMany]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    if (value === lastEmitted.current) return;
    const next = normalizeActivityHtml(value);
    const current = editor.getHTML();
    if (
      next === current ||
      (isActivityValueEmpty(next) && isActivityValueEmpty(current))
    ) {
      lastEmitted.current = value;
      return;
    }
    editor.commands.setContent(next || "", { emitUpdate: false });
    lastEmitted.current = value;
  }, [editor, value]);

  function onImageInput(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? [...event.target.files] : [];
    event.target.value = "";
    void uploadMany(files, "image");
  }

  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? [...event.target.files] : [];
    event.target.value = "";
    void uploadMany(files, "file");
  }

  if (!editor) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-border bg-background px-3 py-6 text-sm text-muted-foreground",
          className
        )}
      >
        <Loader2 className="size-4 animate-spin" />
        Loading editor…
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border bg-background",
        disabled && "opacity-70",
        className
      )}
    >
      <EditorToolbar
        editor={editor}
        disabled={disabled}
        uploading={uploading}
        onPickImage={() => imageInputRef.current?.click()}
        onPickFile={() => fileInputRef.current?.click()}
      />
      <EditorContent editor={editor} />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onImageInput}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={onFileInput}
      />
    </div>
  );
}

type ActivityRichTextViewProps = {
  value: string;
  className?: string;
};

export function ActivityRichTextView({
  value,
  className,
}: ActivityRichTextViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: buildExtensions(""),
    content: normalizeActivityHtml(value) || undefined,
    editorProps: {
      attributes: {
        class: "activity-editor-prose text-sm leading-relaxed",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(normalizeActivityHtml(value) || "", {
      emitUpdate: false,
    });
  }, [editor, value]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    async function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[data-bucket][data-key]") as
        | HTMLAnchorElement
        | null;
      if (!anchor) return;
      event.preventDefault();
      event.stopPropagation();
      const bucket = anchor.getAttribute("data-bucket");
      const key = anchor.getAttribute("data-key");
      const fileName = anchor.getAttribute("data-name") ?? "attachment";
      if (!bucket || !key) return;
      try {
        await downloadFile({
          Bucket: bucket,
          Key: key,
          key,
          Name: fileName,
        });
      } catch (error) {
        notify.fromError(error, "Could not download attachment");
      }
    }

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, []);

  if (!editor) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        Loading…
      </p>
    );
  }

  return (
    <div ref={containerRef} className={cn("activity-rich-view", className)}>
      <EditorContent editor={editor} />
    </div>
  );
}

export { isActivityValueEmpty };
