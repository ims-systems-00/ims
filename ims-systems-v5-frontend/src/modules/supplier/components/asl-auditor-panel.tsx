import { useEffect, useState } from "react";
import { Copy, Download, Loader2, Share2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { FormField } from "@/shared/components/form-field";
import { notify } from "@/shared/lib/toast";
import {
  downloadAslAuditorPack,
  downloadAslAuditorPackFile,
  downloadAslCsv,
} from "../api/asl-supplier";
import { useShareAslMutation } from "../hooks/use-asl-supplier";
import { PageLoader } from "@/shared/components/ims-loader";

export function AslAuditorPanel() {
  const [html, setHtml] = useState<string | null>(null);
  const [loadingHtml, setLoadingHtml] = useState(true);
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const shareMutation = useShareAslMutation();

  useEffect(() => {
    let cancelled = false;
    setLoadingHtml(true);
    void downloadAslAuditorPack("html")
      .then(async (blob) => {
        const text = await blob.text();
        if (!cancelled) setHtml(text);
      })
      .catch(() => {
        if (!cancelled) setHtml(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingHtml(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleShare() {
    try {
      const result = await shareMutation.mutateAsync(expiresInDays);
      setShareUrl(result.url);
      await navigator.clipboard.writeText(result.url);
      notify.success("Share link copied to clipboard");
    } catch (error) {
      notify.fromError(error, "Unable to create share link");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            void downloadAslAuditorPackFile("pdf").then(
              () => notify.success("PDF downloaded"),
              (error) => notify.fromError(error, "Unable to download PDF")
            );
          }}
        >
          <Download className="size-3.5" />
          Download PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void downloadAslAuditorPackFile("html").then(
              () => notify.success("HTML downloaded"),
              (error) => notify.fromError(error, "Unable to download HTML")
            );
          }}
        >
          <Download className="size-3.5" />
          Download HTML
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void downloadAslCsv().then(
              () => notify.success("CSV downloaded"),
              (error) => notify.fromError(error, "Unable to export CSV")
            );
          }}
        >
          <Download className="size-3.5" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border-subtle p-3">
        <FormField label="Share link expiry (days)">
          <input
            className="ims-field w-28"
            type="number"
            min={1}
            max={90}
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(Number(e.target.value))}
          />
        </FormField>
        <Button
          type="button"
          size="sm"
          disabled={shareMutation.isPending}
          onClick={() => void handleShare()}
        >
          {shareMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Share2 className="size-3.5" />
          )}
          Share read-only link
        </Button>
        {shareUrl ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              void navigator.clipboard.writeText(shareUrl).then(() =>
                notify.success("Copied")
              );
            }}
          >
            <Copy className="size-3.5" />
            Copy again
          </Button>
        ) : null}
      </div>
      {shareUrl ? (
        <p className="break-all text-sm text-muted-foreground">{shareUrl}</p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border-subtle bg-white">
        {loadingHtml ? (
          <PageLoader label="Loading auditor pack…" />
        ) : html ? (
          <iframe
            title="ASL auditor pack"
            className="h-[70vh] w-full bg-white"
            srcDoc={html}
          />
        ) : (
          <p className="p-6 text-sm text-muted-foreground">
            Unable to load auditor pack preview.
          </p>
        )}
      </div>
    </div>
  );
}
