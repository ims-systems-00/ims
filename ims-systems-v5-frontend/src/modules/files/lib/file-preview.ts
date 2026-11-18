export type FilePreviewKind =
  | "pdf"
  | "docx"
  | "excel"
  | "csv"
  | "image"
  | "video"
  | "audio"
  | "text"
  | "unsupported";

const IMAGE_EXTENSIONS = new Set(["jpeg", "jpg", "png", "svg", "gif", "webp"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "ogg"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "m4a"]);
const EXCEL_EXTENSIONS = new Set(["xlsx", "xls"]);
const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "log",
  "json",
  "xml",
  "yml",
  "yaml",
]);

/** Kinds that OnlyOffice can open for in-app Edit. */
export const ONLYOFFICE_EDITABLE_KINDS: ReadonlySet<FilePreviewKind> = new Set([
  "pdf",
  "docx",
  "excel",
]);

export function getFileExtension(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? fileName;
  const idx = base.lastIndexOf(".");
  if (idx <= 0 || idx === base.length - 1) return "";
  return base.slice(idx + 1).toLowerCase();
}

export function getFilePreviewKind(fileName: string): FilePreviewKind {
  const ext = getFileExtension(fileName);
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (EXCEL_EXTENSIONS.has(ext)) return "excel";
  if (ext === "csv") return "csv";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (AUDIO_EXTENSIONS.has(ext)) return "audio";
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  return "unsupported";
}

/** Office Online viewer embed for a (signed) document URL. */
export function buildOfficeViewerUrl(fileUrl: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

export function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
