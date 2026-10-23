import { useRef } from "react";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { parseCsvFile } from "../lib/parse-csv";
import {
  useDataImportWizardStore,
} from "../store/data-import-wizard-store";
import type { ImportableModule, ModuleOption, ParsedSheet } from "../types";

type WizardConfigSectionProps = {
  modules: ModuleOption[];
  modulesLoading?: boolean;
};

function newSheetId(): string {
  return `sheet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Step 1 — choose target module, date format, and upload CSV file(s).
 */
export function WizardConfigSection({
  modules,
  modulesLoading,
}: WizardConfigSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const module = useDataImportWizardStore((s) => s.module);
  const dateFormat = useDataImportWizardStore((s) => s.dateFormat);
  const sheets = useDataImportWizardStore((s) => s.sheets);
  const setModule = useDataImportWizardStore((s) => s.setModule);
  const setDateFormat = useDataImportWizardStore((s) => s.setDateFormat);
  const addSheet = useDataImportWizardStore((s) => s.addSheet);
  const removeSheet = useDataImportWizardStore((s) => s.removeSheet);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    if (!module) {
      notify.error("Select a target module before uploading a spreadsheet.");
      return;
    }

    for (const file of Array.from(fileList)) {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        notify.error(`${file.name} is not a CSV file.`);
        continue;
      }
      try {
        const parsed = await parseCsvFile(file);
        if (parsed.columns.length === 0 || parsed.rows.length === 0) {
          notify.error(`${file.name} has no data rows.`);
          continue;
        }
        const sheet: ParsedSheet = {
          id: newSheetId(),
          name: file.name,
          columns: parsed.columns,
          rows: parsed.rows,
          dataMap: {},
          excludedPaths: [],
        };
        addSheet(sheet);
      } catch {
        notify.error(`Could not parse ${file.name}.`);
      }
    }

    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section id="import-configure" className="ims-panel overflow-hidden scroll-mt-4">
      <div className="ims-panel-header">
        <h2 className="text-sm font-semibold tracking-tight">
          1. Welcome to the data import wizard
        </h2>
      </div>
      <div className="grid gap-6 px-4 py-4 lg:grid-cols-2">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a CSV spreadsheet and link its columns to an iMS module.
            Records are created in the background after validation.
          </p>
          <FormField label="Target module" htmlFor="import-module" required>
            <select
              id="import-module"
              className="ims-select"
              value={module}
              disabled={modulesLoading}
              onChange={(event) =>
                setModule(event.target.value as ImportableModule | "")
              }
            >
              <option value="">Select a module</option>
              {modules.map((option) => (
                <option key={option.module} value={option.module}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="File format" htmlFor="import-format">
            <select
              id="import-format"
              className="ims-select"
              value=".csv"
              disabled
            >
              <option value=".csv">CSV (.csv)</option>
            </select>
          </FormField>
          <FormField label="Date format" htmlFor="import-date-format">
            <select
              id="import-date-format"
              className="ims-select"
              value={dateFormat}
              onChange={() => setDateFormat("DD/MM/YYYY")}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY (United Kingdom)</option>
            </select>
          </FormField>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Upload CSV spreadsheet</p>
          <label
            htmlFor="import-csv-input"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface-muted/40 px-4 py-10 text-center transition-colors hover:bg-surface-muted/70"
          >
            <Upload className="size-5 text-muted-foreground" aria-hidden />
            <span className="text-sm font-medium">+ Select spreadsheet</span>
            <span className="text-xs text-muted-foreground">
              CSV only · multiple files allowed
            </span>
            <input
              ref={inputRef}
              id="import-csv-input"
              type="file"
              accept=".csv,text/csv"
              multiple
              className="sr-only"
              onChange={(event) => void handleFiles(event.target.files)}
            />
          </label>

          {sheets.length > 0 ? (
            <ul className="space-y-2">
              {sheets.map((sheet) => (
                <li
                  key={sheet.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileSpreadsheet
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="truncate font-medium">{sheet.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {sheet.columns.length} cols · {sheet.rows.length} rows
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${sheet.name}`}
                    onClick={() => removeSheet(sheet.id)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
