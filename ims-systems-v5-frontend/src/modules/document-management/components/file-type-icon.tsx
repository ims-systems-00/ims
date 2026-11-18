import { cn } from "@/shared/lib/utils";
import folderIcon from "@/assets/images/file-icon/folder.png";
import pdfIcon from "@/assets/images/file-icon/pdf.png";
import docsIcon from "@/assets/images/file-icon/docs.png";
import xlsxIcon from "@/assets/images/file-icon/xlsx.png";
import csvIcon from "@/assets/images/file-icon/csv-file.png";
import imgIcon from "@/assets/images/file-icon/img.png";
import videoIcon from "@/assets/images/file-icon/video.png";

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

const IMAGE_EXTS = [".jpeg", ".jpg", ".png", ".svg", ".gif", ".webp"];
const VIDEO_EXTS = [".mp4", ".webm", ".ogg"];
const EXCEL_EXTS = [".xlsx", ".xls"];

function documentIconSrc(fileName?: string | null): string {
  const lower = (fileName ?? "").toLowerCase();
  if (lower.endsWith(".pdf")) return pdfIcon;
  if (EXCEL_EXTS.some((ext) => lower.endsWith(ext))) return xlsxIcon;
  if (lower.endsWith(".csv")) return csvIcon;
  if (IMAGE_EXTS.some((ext) => lower.endsWith(ext))) return imgIcon;
  if (VIDEO_EXTS.some((ext) => lower.endsWith(ext))) return videoIcon;
  return docsIcon;
}

function documentAlt(fileName?: string | null): string {
  const lower = (fileName ?? "").toLowerCase();
  if (lower.endsWith(".pdf")) return "PDF document";
  if (EXCEL_EXTS.some((ext) => lower.endsWith(ext))) return "Spreadsheet";
  if (lower.endsWith(".csv")) return "CSV file";
  if (IMAGE_EXTS.some((ext) => lower.endsWith(ext))) return "Image";
  if (VIDEO_EXTS.some((ext) => lower.endsWith(ext))) return "Video";
  return "Document";
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
  const alt = type === "folder" ? "Folder" : documentAlt(fileName);

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
