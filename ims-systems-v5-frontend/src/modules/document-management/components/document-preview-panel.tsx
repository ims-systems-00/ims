import { useEffect, useState } from "react";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { createViewUrl } from "@/modules/files";
import type { DocumentFileMeta } from "../types";

type DocumentPreviewPanelProps = {
  storageInfo: DocumentFileMeta | null | undefined;
  title: string;
};

function isPreviewableInBrowser(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith(".pdf") ||
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".txt")
  );
}

/**
 * In-app file preview using a signed view URL (local disk or S3).
 */
export function DocumentPreviewPanel({
  storageInfo,
  title,
}: DocumentPreviewPanelProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!storageInfo?.Bucket || !storageInfo.Key) {
        setUrl(null);
        setError("File metadata missing for this document.");
        return;
      }

      setLoading(true);
      setError(null);
      setUrl(null);

      try {
        const view = await createViewUrl({
          bucket: storageInfo.Bucket,
          key: storageInfo.Key,
          fileName: storageInfo.Name,
        });
        if (cancelled) return;

        if (view.url.startsWith("memory://")) {
          setError(
            "No stored file bytes yet. Enable FILES_PROVIDER=local (or S3) and upload or re-seed demo docs."
          );
          return;
        }

        setUrl(view.url);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Unable to load document preview";
        setError(message);
        notify.fromError(err, "Unable to load document preview");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [storageInfo?.Bucket, storageInfo?.Key, storageInfo?.Name]);

  const fileName = storageInfo?.Name || title;
  const canEmbed = url ? isPreviewableInBrowser(fileName) : false;

  return (
    <div className="flex min-h-[28rem] flex-col overflow-hidden rounded-md border border-border-subtle bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <p className="truncate text-[0.8125rem] font-medium">{fileName}</p>
        </div>
        {url ? (
          <Button type="button" size="sm" variant="outline" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" />
              Open in new tab
            </a>
          </Button>
        ) : null}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col bg-muted/20">
        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 p-8 text-[0.8125rem] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading preview…
          </div>
        ) : null}

        {!loading && error ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-[0.8125rem] text-muted-foreground">
            {error}
          </div>
        ) : null}

        {!loading && !error && url && canEmbed ? (
          <iframe
            title={`Preview of ${fileName}`}
            src={url}
            className="min-h-[32rem] w-full flex-1 border-0 bg-white"
          />
        ) : null}

        {!loading && !error && url && !canEmbed ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="max-w-sm text-[0.8125rem] text-muted-foreground">
              In-app preview is available for PDF and images. Open this file in
              a new tab to download or view it.
            </p>
            <Button type="button" size="sm" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
                Open file
              </a>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
