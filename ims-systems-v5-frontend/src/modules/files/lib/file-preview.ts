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

/**
 * Microsoft Office Online fetches the file from its own servers, so the
 * signed URL must be reachable on the public internet. Local docker /
 * localhost / private LAN URLs always fail with their generic error page.
 */
export function isOfficeOnlineCompatibleUrl(fileUrl: string): boolean {
  try {
    const parsed = new URL(fileUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "0.0.0.0" ||
      host === "backend" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.endsWith(".localhost")
    ) {
      return false;
    }
    // Private / link-local IPv4
    if (
      /^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
