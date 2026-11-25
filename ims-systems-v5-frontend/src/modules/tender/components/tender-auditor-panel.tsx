import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  downloadTenderAuditorPack,
  openTenderAuditorPack,
} from "../api/tender";

export function TenderAuditorPanel() {
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
      notify.success("Ready");
    } catch (error) {
      notify.fromError(error, "Export failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Auditor pack</h2>
        <p className="text-sm text-muted-foreground">
          Live evidence pack covering library health, open bids, certificates,
          policies and recent activity.
        </p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void run("pack", openTenderAuditorPack)}
          >
            {busy === "pack" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
            Open / print pack
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(busy)}
            onClick={() =>
              void run("html", () => downloadTenderAuditorPack("html"))
            }
          >
            {busy === "html" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Download HTML
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(busy)}
            onClick={() =>
              void run("pdf", () => downloadTenderAuditorPack("pdf"))
            }
          >
            {busy === "pdf" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
