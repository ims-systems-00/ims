import { useState } from "react";
import { CheckCircle2, Download, FileText, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  downloadAuditorPackPdf,
  downloadMatrixCsv,
  openAuditorPack,
} from "../api/training";
import { useTrainingReadinessQuery } from "../hooks/use-training";

export function TrainingAuditorPanel() {
  const [busy, setBusy] = useState<string | null>(null);
  const readinessQuery = useTrainingReadinessQuery();
  const readiness = readinessQuery.data ?? [];
  const passCount = readiness.filter((r) => r.ok).length;

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
          Live evidence pack for competence — readiness checks, printable HTML,
          and matrix CSV.
        </p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void run("pack", openAuditorPack)}
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
            onClick={() => void run("pdf", downloadAuditorPackPdf)}
          >
            {busy === "pdf" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Download PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(busy)}
            onClick={() => void run("csv", downloadMatrixCsv)}
          >
            {busy === "csv" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Matrix CSV
          </Button>
        </div>
      </div>

      <section className="rounded-xl border border-border-subtle bg-card p-4">
        <h3 className="mb-1 text-sm font-semibold">Readiness checks</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          {readinessQuery.isLoading
            ? "Loading…"
            : `${passCount}/${readiness.length} passing`}
        </p>
        <div className="space-y-2">
          {readiness.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2 rounded-lg border border-border-subtle/80 px-3 py-2"
            >
              {item.ok ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium leading-snug">
                  {item.text}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.basis} · {item.tag}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
