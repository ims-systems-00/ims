import type { DocumentTreeNode } from "../types";

export const REPO_SORT_FIELDS = [
  "name",
  "dateModified",
  "type",
  "size",
] as const;

export type RepoSortField = (typeof REPO_SORT_FIELDS)[number];
export type RepoSortDir = "asc" | "desc";

export const REPO_SORT_FIELD_LABELS: Record<RepoSortField, string> = {
  name: "Name",
  dateModified: "Date modified",
  type: "Type",
  size: "Size",
};

function fileExtension(name: string): string {
  const base = name.trim();
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

function modifiedAtMs(node: DocumentTreeNode): number {
  const raw =
    node.updatedOn ??
    node.updatedAt ??
    node.folderData?.modifiedOn ??
    node.createdOn ??
    node.createdAt ??
    "";
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

function nodeSizeBytes(node: DocumentTreeNode): number {
  if (node.type === "folder") return -1;
  const size = node.documentData?.storageInfo?.Size;
  return typeof size === "number" && Number.isFinite(size) ? size : 0;
}

function typeSortKey(node: DocumentTreeNode): string {
  if (node.type === "folder") return "0-folder";
  const ext = fileExtension(
    node.documentData?.storageInfo?.Name ?? node.name
  );
  return `1-${ext || "file"}`;
}

/**
 * Sort folder/document nodes for the repository browser.
 * Unknown sizes sort as 0 (folders as -1 so they group first when ascending).
 */
export function sortRepoNodes(
  nodes: DocumentTreeNode[],
  field: RepoSortField,
  dir: RepoSortDir
): DocumentTreeNode[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...nodes].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "name":
        cmp = a.name.localeCompare(b.name, undefined, {
          sensitivity: "base",
          numeric: true,
        });
        break;
      case "dateModified":
        cmp = modifiedAtMs(a) - modifiedAtMs(b);
        break;
      case "type":
        cmp = typeSortKey(a).localeCompare(typeSortKey(b));
        break;
      case "size":
        cmp = nodeSizeBytes(a) - nodeSizeBytes(b);
        break;
    }
    if (cmp === 0) {
      cmp = a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
        numeric: true,
      });
    }
    if (cmp === 0) cmp = a.id.localeCompare(b.id);
    return cmp * mul;
  });
}
