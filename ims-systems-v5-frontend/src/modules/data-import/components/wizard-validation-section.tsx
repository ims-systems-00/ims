import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { useValidateImportMutation } from "../hooks/use-data-import";
import { missingRequiredFields } from "../lib/auto-map";
import { formatImportApiError } from "../lib/format-api-error";
import {
  activeDataMap,
  useDataImportWizardStore,
} from "../store/data-import-wizard-store";
import type {
  ImportableFieldSchema,
  ImportableModule,
  ImportDateFormat,
  ValidationOutcome,
} from "../types";

type WizardValidationSectionProps = {
  fields: ImportableFieldSchema[];
};

type SheetProgress = {
  index: number;
  total: number;
  sheetId: string;
  name: string;
};

function requiredMappingsComplete(
  fields: ImportableFieldSchema[],
  dataMap: ReturnType<typeof activeDataMap>,
  excludedPaths: string[]
): boolean {
  return missingRequiredFields(fields, dataMap, excludedPaths).length === 0;
}

function downloadErrorReport(sheetName: string, validation: ValidationOutcome) {
  const lines = ["field,message"];
  for (const field of validation.result) {
    for (const error of field.errors) {
      const safe = error.message.replaceAll('"', '""');
      lines.push(`"${field.name}","${safe}"`);
    }
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${sheetName.replace(/\.csv$/i, "")}-validation-errors.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Step 3 — validate every sheet against module rules before migration.
 */
export function WizardValidationSection({
  fields,
}: WizardValidationSectionProps) {
  const module = useDataImportWizardStore((s) => s.module);
  const dateFormat = useDataImportWizardStore((s) => s.dateFormat);
  const sheets = useDataImportWizardStore((s) => s.sheets);
  const setSheetValidation = useDataImportWizardStore(
    (s) => s.setSheetValidation
  );
  const setPhase = useDataImportWizardStore((s) => s.setPhase);
  const validateMutation = useValidateImportMutation();
  const [progress, setProgress] = useState<SheetProgress | null>(null);

  if (sheets.length === 0 || !module) return null;

  const canValidate = sheets.every((sheet) =>
    requiredMappingsComplete(
      fields,
      activeDataMap(sheet),
      sheet.excludedPaths
    )
  );
  const missingBySheet = sheets.map((sheet) => ({
    name: sheet.name,
    missing: missingRequiredFields(
      fields,
      activeDataMap(sheet),
      sheet.excludedPaths
    ),
  }));
  const allValidated = sheets.every((sheet) => sheet.validation);
  const allPassed =
    allValidated && sheets.every((sheet) => sheet.validation?.success);
  const isPending = validateMutation.isPending || progress !== null;

  async function handleValidate() {
    if (!module || !canValidate) return;
    try {
      let allOk = true;
      const total = sheets.length;
      for (let index = 0; index < sheets.length; index += 1) {
        const sheet = sheets[index];
        setProgress({
          index: index + 1,
          total,
          sheetId: sheet.id,
          name: sheet.name,
        });
        const response = await validateMutation.mutateAsync({
          module: module as ImportableModule,
          dateFormat: dateFormat as ImportDateFormat,
          format: ".csv",
          dataMap: activeDataMap(sheet),
          dataSet: sheet.rows,
        });
        setSheetValidation(sheet.id, response.validation);
        if (!response.validation.success) allOk = false;
      }
      if (allOk) {
        setPhase("migrate");
        notify.success("Validation successful — you can start migration.");
      } else {
        setPhase("validate");
        notify.error("Validation failed. Review the errors below.");
      }
    } catch (error) {
      notify.error(formatImportApiError(error, "Validation request failed"));
    } finally {
      setProgress(null);
    }
  }

  return (
    <section
      id="import-validate"
      className="ims-panel overflow-hidden scroll-mt-4"
    >
      <div className="ims-panel-header flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">
          3. Validate your dataset
        </h2>
        <Button
          type="button"
          disabled={!canValidate || isPending}
          onClick={() => void handleValidate()}
        >
          {isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Validating data
            </>
          ) : (
            "Validate dataset"
          )}
        </Button>
      </div>
      <div className="space-y-4 px-4 py-4">
        {!canValidate ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Map every required field in section 2 before validating. Matching
              CSV headers are auto-linked;{" "}
              <span className="font-medium text-foreground">
                Business function
              </span>{" "}
              (and Owner, if required) must be chosen from the organisation
              dropdowns — they are not read from the spreadsheet.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {missingBySheet.map(({ name, missing }) =>
                missing.length > 0 ? (
                  <li key={name}>
                    <span className="font-medium text-foreground">{name}</span>
                    : still need{" "}
                    {missing.map((field) => field.alias).join(", ")}
                  </li>
                ) : null
              )}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            We scan every mapped row against module rules. All sheets must pass
            before migration unlocks.
          </p>
        )}

        {progress ? (
          <div className="space-y-2 rounded-md border border-border bg-surface-muted/30 px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">
                Validating sheet {progress.index} of {progress.total}
              </span>
              <span className="text-muted-foreground">{progress.name}</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.index}
              aria-label={`Validating sheet ${progress.index} of ${progress.total}`}
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

        {sheets.map((sheet) => {
          const validation = sheet.validation;
          const isActive = progress?.sheetId === sheet.id;
          return (
            <div
              key={sheet.id}
              className={
                isActive
                  ? "rounded-md border border-primary/40 px-3 py-3"
                  : "rounded-md border border-border px-3 py-3"
              }
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  {sheet.name}
                  {isActive ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      Checking…
                    </span>
                  ) : null}
                </h3>
                {validation && !validation.success ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      downloadErrorReport(sheet.name, validation)
                    }
                  >
                    <Download className="size-3.5" aria-hidden />
                    Download report
                  </Button>
                ) : null}
              </div>

              {!validation ? (
                <p className="text-sm text-muted-foreground">
                  Not validated yet.
                </p>
              ) : validation.success ? (
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  No validation errors
                </p>
              ) : (
                <ul className="space-y-3">
                  {validation.result
                    .filter((field) => field.totalError > 0)
                    .map((field) => (
                      <li key={field.name}>
                        <p className="text-sm font-medium">
                          {field.name}{" "}
                          <span className="text-muted-foreground">
                            ({field.totalError})
                          </span>
                        </p>
                        <ul className="mt-1 space-y-0.5 text-xs text-destructive">
                          {field.errors.slice(0, 5).map((error, index) => (
                            <li key={`${field.name}-${index}`}>
                              {error.message}
                            </li>
                          ))}
                          {field.errors.length > 5 ? (
                            <li>
                              …and {field.errors.length - 5} more (download
                              report for full list)
                            </li>
                          ) : null}
                        </ul>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          );
        })}

        {allPassed ? (
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            All sheets passed validation. Continue to step 4 to start
            migration.
          </p>
        ) : null}
      </div>
    </section>
  );
}
