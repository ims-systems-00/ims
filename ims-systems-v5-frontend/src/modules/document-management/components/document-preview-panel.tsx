import { useCallback, useState } from "react";
import {
  Download,
  Expand,
  ExternalLink,
  FileText,
  Pencil,
  X,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { notify } from "@/shared/lib/toast";
import { loadPublicEnv } from "@/shared/lib/env";
import {
  FilePreview,
  FilePreviewModal,
  getFilePreviewKind,
  useDownloadFileMutation,
  useFileViewUrlQuery,
  type FilePreviewKind,
} from "@/modules/files";
import {
  useCreateDocumentEditorSessionMutation,
  useInvalidateDocumentQueries,
} from "../hooks/use-document-management";
import type { DocumentEditorSession, DocumentFileMeta } from "../types";
import { DocumentOfficeEditor } from "./document-office-editor";

type DocumentPreviewPanelProps = {
  storageInfo: DocumentFileMeta | null | undefined;
  title: string;
  repositoryId?: string;
  nodeId?: string;
  /** Published documents with Office files can open OnlyOffice edit. */
  canEditInPreview?: boolean;
};

const KIND_LABELS: Record<FilePreviewKind, string> = {
  pdf: "PDF",
  image: "Image",
  office: "Office document",
  text: "Text",
  unsupported: "File",
};

function isOnlyOfficeConfigured(): boolean {
  try {
    return Boolean(loadPublicEnv().VITE_ONLYOFFICE_URL?.trim());
  } catch {
    return false;
  }
}

/**
 * In-app document preview panel (document detail page). Delegates the
 * rendering to the shared File Handler preview: PDF inline, images,
 * Office Online embed, plain-text inline, download fallback otherwise.
 * When OnlyOffice is configured and the node is published Office or PDF,
 * Edit opens a WYSIWYG session; saves create a new pending/published version.
 */
export function DocumentPreviewPanel({
  storageInfo,
  title,
  repositoryId,
  nodeId,
  canEditInPreview = false,
}: DocumentPreviewPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editorSession, setEditorSession] =
    useState<DocumentEditorSession | null>(null);

  const fileName = storageInfo?.Name || title;
  const hasFile = Boolean(storageInfo?.Bucket && storageInfo.Key);
  const kind = getFilePreviewKind(fileName);
  const onlyOfficeReady = isOnlyOfficeConfigured();
  const showEdit =
    canEditInPreview &&
    (kind === "office" || kind === "pdf") &&
    onlyOfficeReady &&
    Boolean(repositoryId && nodeId);

  const viewQuery = useFileViewUrlQuery(storageInfo, hasFile);
  const downloadMutation = useDownloadFileMutation();
  const editorMutation = useCreateDocumentEditorSessionMutation(
    repositoryId ?? ""
  );
  const invalidateDocuments = useInvalidateDocumentQueries(repositoryId);
  const viewUrl = viewQuery.data?.url;
  const canOpenExternal = Boolean(viewUrl && !viewUrl.startsWith("memory://"));

  function openExternal() {
    if (!viewUrl) return;
    window.open(viewUrl, "_blank", "noopener,noreferrer");
  }

  async function startEditing() {
    if (!nodeId || !repositoryId) return;
    try {
      const session = await editorMutation.mutateAsync(nodeId);
      setEditorSession(session);
      setEditing(true);
    } catch (error) {
      notify.fromError(error, "Unable to open the document editor");
    }
  }

  function stopEditing() {
    setEditing(false);
    setEditorSession(null);
  }

  const handleDocumentSaved = useCallback(() => {
    void invalidateDocuments();
    notify.success(
      "Saved as a new version. Check Versions for the pending or published copy."
    );
  }, [invalidateDocuments]);

  const handleEditorError = useCallback((message: string) => {
    notify.error(message);
  }, []);

  return (
    <div className="flex min-h-[28rem] flex-col overflow-hidden rounded-md border border-border-subtle bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <p className="truncate text-[0.8125rem] font-medium">{fileName}</p>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
            {editing ? "Editing" : KIND_LABELS[kind]}
          </span>
        </div>

        {hasFile && storageInfo ? (
          <div className="flex shrink-0 items-center gap-1">
            {showEdit ? (
              editing ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Close editor"
                  title="Close editor"
                  onClick={stopEditing}
                >
                  <X className="size-3.5" />
                  Close editor
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Edit document"
                  title="Edit in preview (saves as a new version)"
                  disabled={editorMutation.isPending}
                  onClick={() => void startEditing()}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              )
            ) : null}
            {!editing ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Open preview in a new tab"
                  title="Open in new tab"
                  disabled={!canOpenExternal}
                  onClick={openExternal}
                >
                  <ExternalLink className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Expand preview"
                  title="Expand preview"
                  onClick={() => setExpanded(true)}
                >
                  <Expand className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Download file"
                  title="Download"
                  disabled={downloadMutation.isPending}
                  onClick={() =>
                    downloadMutation.mutate(storageInfo, {
                      onError: () =>
                        notify.error("Could not download this file"),
                    })
                  }
                >
                  <Download className="size-3.5" />
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col bg-muted/20">
        {editing && editorSession ? (
          <ErrorBoundary
            resetKey={editorSession.config.document.key}
            fallback={
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <p className="max-w-md text-sm text-destructive">
                  The document editor crashed while loading. Close the editor
                  and try again, or confirm OnlyOffice is running on{" "}
                  {loadPublicEnv().VITE_ONLYOFFICE_URL || "the configured URL"}.
                </p>
                <Button type="button" size="sm" variant="outline" onClick={stopEditing}>
                  Close editor
                </Button>
              </div>
            }
          >
            <DocumentOfficeEditor
              session={editorSession}
              onDocumentSaved={handleDocumentSaved}
              onError={handleEditorError}
            />
          </ErrorBoundary>
        ) : hasFile && storageInfo ? (
          <FilePreview file={storageInfo} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-[0.8125rem] text-muted-foreground">
            File metadata missing for this document.
          </div>
        )}
      </div>

      {storageInfo && !editing ? (
        <FilePreviewModal
          file={storageInfo}
          open={expanded}
          onOpenChange={setExpanded}
        />
      ) : null}
    </div>
  );
}
