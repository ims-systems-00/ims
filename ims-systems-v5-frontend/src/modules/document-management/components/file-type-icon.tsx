import { cn } from "@/shared/lib/utils";
import folderIcon from "@/assets/images/folder.png";
import pdfIcon from "@/assets/images/pdf.png";
import docsIcon from "@/assets/images/docs.png";

type FileTypeIconProps = {
  type: "folder" | "document";
  fileName?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASS = {
  sm: "size-4",
  md: "size-10",
  lg: "size-14",
} as const;

function documentIconSrc(fileName?: string | null): string {
  const lower = (fileName ?? "").toLowerCase();
  if (lower.endsWith(".pdf")) return pdfIcon;
  return docsIcon;
}

/**
 * OS-style folder / file icons from local assets.
 */
export function FileTypeIcon({
  type,
  fileName,
  size = "md",
  className,
}: FileTypeIconProps) {
  const src = type === "folder" ? folderIcon : documentIconSrc(fileName);
  const alt =
    type === "folder"
      ? "Folder"
      : (fileName ?? "").toLowerCase().endsWith(".pdf")
        ? "PDF document"
        : "Document";

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={cn(
        "shrink-0 object-contain select-none",
        SIZE_CLASS[size],
        className
      )}
    />
  );
}
