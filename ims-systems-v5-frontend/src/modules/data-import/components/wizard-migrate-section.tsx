import { useState } from "react";
import { Loader2 } from "lucide-react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/toast";
import { useStartImportMutation } from "../hooks/use-data-import";
import { formatImportApiError } from "../lib/format-api-error";
import {
  activeDataMap,
  useDataImportWizardStore,
} from "../store/data-import-wizard-store";
import type { ImportableModule, ImportDateFormat } from "../types";

type SheetProgress = {
  index: number;
  total: number;
  name: string;
};

/**
 * Step 4 — typed confirmation (`migrate`) then queue background import.
 */
export function WizardMigrateSection() {
  const module = useDataImportWizardStore((s) => s.module);
  const dateFormat = useDataImportWizardStore((s) => s.dateFormat);
  const sheets = useDataImportWizardStore((s) => s.sheets);
  const confirmText = useDataImportWizardStore((s) => s.confirmText);
  const submitting = useDataImportWizardStore((s) => s.submitting);
  const setConfirmText = useDataImportWizardStore((s) => s.setConfirmText);
  const setSubmitting = useDataImportWizardStore((s) => s.setSubmitting);
  const setPhase = useDataImportWizardStore((s) => s.setPhase);
  const startMutation = useStartImportMutation();
  const [progress, setProgress] = useState<SheetProgress | null>(null);

  const allPassed =
    sheets.length > 0 &&
    sheets.every((sheet) => sheet.validation?.success === true);

  if (!allPassed || !module) return null;

  const canStart =
    confirmText.trim().toLowerCase() === "migrate" && !submitting;

  async function handleStart() {
    if (!canStart || !module) return;
    setSubmitting(true);
    try {
      const total = sheets.length;
      for (let index = 0; index < sheets.length; index += 1) {
        const sheet = sheets[index];
        setProgress({ index: index + 1, total, name: sheet.name });
        await startMutation.mutateAsync({
          module: module as ImportableModule,
          dateFormat: dateFormat as ImportDateFormat,
          format: ".csv",
          dataMap: activeDataMap(sheet),
          dataSet: sheet.rows,
        });
      }
      setPhase("done");
      notify.success(
        "We received your data. You will be notified once import is complete."
      );
    } catch (error) {
      notify.error(formatImportApiError(error, "Import could not be started"));
    } finally {
      setProgress(null);
      setSubmitting(false);
    }
  }

  return (
    <section
      id="import-migrate"
      className="ims-panel overflow-hidden scroll-mt-4"
    >
      <div className="ims-panel-header">
        <h2 className="text-sm font-semibold tracking-tight">
          4. Start importing dataset
        </h2>
      </div>
      <div className="space-y-4 px-4 py-4">
        <p className="text-sm text-muted-foreground">
          Re-validate if you changed the module or mappings. Type{" "}
          <span className="font-semibold text-foreground">migrate</span> to
          confirm, then start the background import.
        </p>

        {sheets.length > 1 ? (
          <p className="text-sm text-muted-foreground">
            {sheets.length} sheets will be queued one after another.
          </p>
        ) : null}

        {progress ? (
          <div className="space-y-2 rounded-md border border-border bg-surface-muted/30 px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">
                Queuing sheet {progress.index} of {progress.total}
              </span>
              <span className="text-muted-foreground">{progress.name}</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.index}
              aria-label={`Queuing sheet ${progress.index} of ${progress.total}`}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{
                  width: `${Math.round((progress.index / progress.total) * 100)}%`,
                }}
              />
            </div>
          </div>
        ) : null}

        <FormField
          label='Type "migrate" to confirm'
          htmlFor="import-confirm"
          required
        >
          <Input
            id="import-confirm"
            value={confirmText}
            autoComplete="off"
            placeholder="migrate"
            disabled={submitting}
            onChange={(event) => setConfirmText(event.target.value)}
          />
        </FormField>
        <Button
          type="button"
          disabled={!canStart}
          onClick={() => void handleStart()}
        >
          {submitting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {progress
                ? `Processing ${progress.index}/${progress.total}`
                : "Processing"}
            </>
          ) : (
            "Start Migration"
          )}
        </Button>
      </div>
    </section>
  );
}
