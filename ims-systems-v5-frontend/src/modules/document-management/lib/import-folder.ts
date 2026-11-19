/** Client-side limits for nested folder import (aligned with DM zip / File Handler). */
export const IMPORT_MAX_FILES = 200;
export const IMPORT_MAX_TOTAL_BYTES = 250 * 1024 * 1024;
export const IMPORT_MAX_FILE_BYTES = 25 * 1024 * 1024;
export const IMPORT_MAX_FOLDER_DEPTH = 20;
export const IMPORT_FILE_BATCH_SIZE = 50;

export type ImportFileEntry = {
  file: File;
  /** Folder segments relative to the selected root (excludes basename). */
  folderSegments: string[];
  /** Display / storage basename. */
  basename: string;
  relativePath: string;
};

export type ImportSelectionStats = {
  entries: ImportFileEntry[];
  folderPaths: string[];
  fileCount: number;
  folderCount: number;
  totalBytes: number;
  skippedHidden: number;
};

function splitRelativePath(relativePath: string): {
  segments: string[];
  basename: string;
} | null {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 2) {
    // Directory picker always includes the root folder name; lone basename is unexpected.
    if (parts.length === 1) {
      return { segments: [], basename: parts[0]! };
    }
    return null;
  }
  const basename = parts[parts.length - 1]!;
  const segments = parts.slice(0, -1);
  return { segments, basename };
}

function isHiddenPath(segments: string[], basename: string): boolean {
  return (
    basename.startsWith(".") ||
    segments.some((segment) => segment.startsWith("."))
  );
}

/**
 * Build import entries from a directory FileList (`webkitdirectory`).
 * Skips hidden/junk paths (e.g. `.DS_Store`).
 */
export function buildImportSelection(
  list: FileList | File[]
): ImportSelectionStats {
  const files = Array.from(list);
  const entries: ImportFileEntry[] = [];
  const folderPathSet = new Set<string>();
  let skippedHidden = 0;
  let totalBytes = 0;

  for (const file of files) {
    const relativePath =
      (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
      file.name;
    const parsed = splitRelativePath(relativePath);
    if (!parsed) continue;
    if (isHiddenPath(parsed.segments, parsed.basename)) {
      skippedHidden += 1;
      continue;
    }
    // Accumulate every prefix folder path for ensure order.
    for (let i = 1; i <= parsed.segments.length; i += 1) {
      folderPathSet.add(parsed.segments.slice(0, i).join("/"));
    }
    totalBytes += file.size;
    entries.push({
      file,
      folderSegments: parsed.segments,
      basename: parsed.basename,
      relativePath,
    });
  }

  const folderPaths = sortFolderPaths(Array.from(folderPathSet));

  return {
    entries,
    folderPaths,
    fileCount: entries.length,
    folderCount: folderPaths.length,
    totalBytes,
    skippedHidden,
  };
}

function sortFolderPaths(paths: string[]): string[] {
  return [...paths].sort((a, b) => {
    const depthA = a.split("/").length;
    const depthB = b.split("/").length;
    if (depthA !== depthB) return depthA - depthB;
    return a.localeCompare(b);
  });
}

/** Drop one file from a selection and recompute folder paths / totals. */
export function removeImportEntry(
  stats: ImportSelectionStats,
  relativePath: string
): ImportSelectionStats {
  const entries = stats.entries.filter(
    (entry) => entry.relativePath !== relativePath
  );
  const folderPathSet = new Set<string>();
  let totalBytes = 0;
  for (const entry of entries) {
    totalBytes += entry.file.size;
    for (let i = 1; i <= entry.folderSegments.length; i += 1) {
      folderPathSet.add(entry.folderSegments.slice(0, i).join("/"));
    }
  }
  const folderPaths = sortFolderPaths(Array.from(folderPathSet));
  return {
    entries,
    folderPaths,
    fileCount: entries.length,
    folderCount: folderPaths.length,
    totalBytes,
    skippedHidden: stats.skippedHidden,
  };
}

export type ImportValidationIssue = {
  code:
    | "empty"
    | "too_many_files"
    | "total_too_large"
    | "file_too_large"
    | "depth_exceeded"
    | "name_too_long";
  message: string;
};

/**
 * Hard-stop validation before any upload. `parentPathLength` is the number of
 * ancestors of the current location (0 at repo root).
 */
export function validateImportSelection(
  stats: ImportSelectionStats,
  parentPathLength: number
): ImportValidationIssue | null {
  if (stats.fileCount === 0) {
    return {
      code: "empty",
      message:
        stats.skippedHidden > 0
          ? "No importable files found (hidden files were skipped)."
          : "Select a folder that contains at least one file.",
    };
  }
  if (stats.fileCount > IMPORT_MAX_FILES) {
    return {
      code: "too_many_files",
      message: `Import is limited to ${IMPORT_MAX_FILES} files (selected ${stats.fileCount}).`,
    };
  }
  if (stats.totalBytes > IMPORT_MAX_TOTAL_BYTES) {
    return {
      code: "total_too_large",
      message: `Import is limited to ${Math.round(IMPORT_MAX_TOTAL_BYTES / (1024 * 1024))} MiB total.`,
    };
  }
  const oversized = stats.entries.find(
    (entry) => entry.file.size > IMPORT_MAX_FILE_BYTES
  );
  if (oversized) {
    return {
      code: "file_too_large",
      message: `"${oversized.basename}" exceeds the ${Math.round(IMPORT_MAX_FILE_BYTES / (1024 * 1024))} MiB per-file limit.`,
    };
  }
  const maxSegments = IMPORT_MAX_FOLDER_DEPTH - parentPathLength;
  const tooDeep = stats.entries.find(
    (entry) => entry.folderSegments.length > maxSegments
  );
  if (tooDeep || maxSegments < 1) {
    return {
      code: "depth_exceeded",
      message: `Import would exceed the maximum folder depth of ${IMPORT_MAX_FOLDER_DEPTH}.`,
    };
  }
  for (const entry of stats.entries) {
    if (entry.basename.length > 255) {
      return {
        code: "name_too_long",
        message: `File name is too long: "${entry.basename.slice(0, 40)}…"`,
      };
    }
    for (const segment of entry.folderSegments) {
      if (segment.length > 255) {
        return {
          code: "name_too_long",
          message: `Folder name is too long: "${segment.slice(0, 40)}…"`,
        };
      }
    }
  }
  return null;
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

/** Detect directory-picker support (Chrome/Edge/Safari; limited elsewhere). */
export function supportsDirectoryPicker(): boolean {
  if (typeof document === "undefined") return false;
  const input = document.createElement("input");
  input.type = "file";
  return "webkitdirectory" in input || "directory" in input;
}
