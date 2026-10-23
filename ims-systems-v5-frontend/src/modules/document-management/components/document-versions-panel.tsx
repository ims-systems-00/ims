import { Download, Eye, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/status-badge";
import { notify } from "@/shared/lib/toast";
import {
  downloadFile,
  FilePreviewModal,
  type FileMetaInfo,
} from "@/modules/files";
import { useNodeVersionsQuery } from "../hooks/use-document-management";
import { formatDocumentDate } from "../lib/format";
import type { DocumentTreeNode } from "../types";

function statusTone(status: string) {
  if (status === "Published") return "success" as const;
  if (status === "Pending") return "warning" as const;
  if (status === "Rejected") return "destructive" as const;
  return "neutral" as const;
}

function toMeta(node: DocumentTreeNode): FileMetaInfo | null {
  const info = node.documentData?.storageInfo;
  if (!info?.Bucket || !info.Key) return null;
  return info;
}

/** Real version-family table (threadId / dvID) for the Versions tab. */
export function DocumentVersionsPanel({
  repositoryId,
  nodeId,
  userNames,
}: {
  repositoryId: string;
  nodeId: string;
  userNames: Record<string, string>;
}) {
  const versionsQuery = useNodeVersionsQuery(repositoryId, nodeId);
  const [preview, setPreview] = useState<FileMetaInfo | null>(null);

  if (versionsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-card px-4 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading versions…
      </div>
    );
  }
  if (versionsQuery.isError || !versionsQuery.data) {
    return (
      <div className="rounded-xl border border-border-subtle bg-card px-4 py-10 text-sm text-muted-foreground">
        Versions could not be loaded.
      </div>
    );
  }

  const versions = [...versionsQuery.data].sort(
    (a, b) => (b.documentData?.dvID ?? 0) - (a.documentData?.dvID ?? 0)
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Version</th>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Owners</th>
            <th className="px-4 py-3 font-medium">Updated</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((version) => {
            const meta = toMeta(version);
            return (
              <tr
                key={version.id}
                className="border-b border-border-subtle last:border-0"
              >
                <td className="px-4 py-3 tabular-nums">
                  v{version.documentData?.dvID ?? "—"}
                  {version.id === nodeId ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (current)
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">{version.name}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={statusTone(version.status)}>
                    {version.status}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {(version.documentData?.owners ?? [])
                    .map((id) => userNames[id] ?? id)
                    .join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDocumentDate(
                    version.updatedOn ?? version.createdOn
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!meta}
                      aria-label={`Preview version ${version.documentData?.dvID ?? ""}`}
                      onClick={() => meta && setPreview(meta)}
                    >
                      <Eye className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!meta}
                      aria-label={`Download version ${version.documentData?.dvID ?? ""}`}
                      onClick={() => {
                        if (meta) {
                          void downloadFile(meta).catch((error) =>
                            notify.fromError(error, "Document download failed")
                          );
                        }
                      }}
                    >
                      <Download className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {versions.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted-foreground">
          No versions found for this document.
        </p>
      ) : null}
      <FilePreviewModal
        file={preview}
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      />
    </div>
  );
}
