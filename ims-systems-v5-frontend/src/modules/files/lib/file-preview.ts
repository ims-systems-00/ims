export type FilePreviewKind =
  | "pdf"
  | "image"
  | "office"
  | "text"
  | "unsupported";

const IMAGE_EXTENSIONS = new Set(["jpeg", "jpg", "png", "svg", "gif", "webp"]);
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
const OFFICE_EXTENSIONS = new Set([
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "csv",
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
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (OFFICE_EXTENSIONS.has(ext)) return "office";
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
