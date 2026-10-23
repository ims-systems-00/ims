import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { FormField } from "@/shared/components/form-field";
import { cn } from "@/shared/lib/utils";
import { missingRequiredFields } from "../lib/auto-map";
import {
  activeDataMap,
  useDataImportWizardStore,
} from "../store/data-import-wizard-store";
import type { ImportableFieldSchema, ParsedSheet } from "../types";

type DirectoryOption = { id: string; label: string };

type WizardMappingSectionProps = {
  fields: ImportableFieldSchema[];
  businessUnits: DirectoryOption[];
  users: DirectoryOption[];
  /** True while business-unit directory is still loading. */
  directoryLoading?: boolean;
};

function SheetMappingCard({
  sheet,
  fields,
  businessUnits,
  users,
}: {
  sheet: ParsedSheet;
  fields: ImportableFieldSchema[];
  businessUnits: DirectoryOption[];
  users: DirectoryOption[];
}) {
  const setFieldMapping = useDataImportWizardStore((s) => s.setFieldMapping);
  const setFieldExcluded = useDataImportWizardStore((s) => s.setFieldExcluded);

  const missing = missingRequiredFields(
    fields,
    activeDataMap(sheet),
    sheet.excludedPaths
  );
  const requiredCount = fields.filter((field) => field.isRequired).length;
  const mappedRequired = requiredCount - missing.length;
  const ready = missing.length === 0;

  return (
    <div
      className={cn(
        "rounded-md border",
        ready ? "border-border" : "border-amber-600/40"
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border bg-surface-muted/40 px-3 py-2">
        <h3 className="text-sm font-semibold">{sheet.name}</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            {sheet.columns.length} columns · {sheet.rows.length} rows
          </span>
          {ready ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-600/30 bg-emerald-600/10 px-2 py-0.5 font-medium text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="size-3" aria-hidden />
              Ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-600/30 bg-amber-600/10 px-2 py-0.5 font-medium text-amber-900 dark:text-amber-200">
              {mappedRequired}/{requiredCount} required mapped
            </span>
          )}
        </div>
      </div>
      <div className="divide-y divide-border">
        {fields.map((field) => {
          const excluded = sheet.excludedPaths.includes(field.path);
          const migrate = field.isRequired || !excluded;
          const value = sheet.dataMap[field.path] ?? "";
          const needsMapping =
            field.isRequired && migrate && !value;

          return (
            <div
              key={field.path}
              className={cn(
                "grid gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-end",
                needsMapping && "bg-amber-500/5"
              )}
            >
              <div>
                <p className="text-sm font-medium">
                  {field.alias}
                  {field.isRequired ? (
                    <span className="text-destructive"> *</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">{field.path}</p>
                {needsMapping ? (
                  <p className="mt-1 text-xs font-medium text-amber-800 dark:text-amber-200">
                    Required — pick a value to continue
                  </p>
                ) : null}
              </div>

              <FormField
                label={
                  field.isBusinessUnitController
                    ? "Business function"
                    : field.isOwnerShipControler
                      ? "Owner"
                      : "Spreadsheet column"
                }
                htmlFor={`${sheet.id}-${field.path}`}
              >
                {field.isBusinessUnitController ? (
                  <select
                    id={`${sheet.id}-${field.path}`}
                    className={cn(
                      "ims-select",
                      needsMapping && "border-amber-600/50"
                    )}
                    value={value}
                    disabled={!migrate}
                    onChange={(event) =>
                      setFieldMapping(
                        sheet.id,
                        field.path,
                        event.target.value || null
                      )
                    }
                  >
                    <option value="">Select business function</option>
                    {businessUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                ) : field.isOwnerShipControler ? (
                  <select
                    id={`${sheet.id}-${field.path}`}
                    className={cn(
                      "ims-select",
                      needsMapping && "border-amber-600/50"
                    )}
                    value={value}
                    disabled={!migrate}
                    onChange={(event) =>
                      setFieldMapping(
                        sheet.id,
                        field.path,
                        event.target.value || null
                      )
                    }
                  >
                    <option value="">Select user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    id={`${sheet.id}-${field.path}`}
                    className={cn(
                      "ims-select",
                      needsMapping && "border-amber-600/50"
                    )}
                    value={value}
                    disabled={!migrate}
                    onChange={(event) =>
                      setFieldMapping(
                        sheet.id,
                        field.path,
                        event.target.value || null
                      )
                    }
                  >
                    <option value="">Select column</option>
                    {sheet.columns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>

              <label className="flex h-9 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-3.5 rounded border-border"
                  checked={migrate}
                  disabled={field.isRequired}
                  onChange={(event) =>
                    setFieldExcluded(
                      sheet.id,
                      field.path,
                      !event.target.checked
                    )
                  }
                />
                Migrate
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Step 2 — map spreadsheet columns (or org directory values) to system fields.
 */
export function WizardMappingSection({
  fields,
  businessUnits,
  users,
  directoryLoading = false,
}: WizardMappingSectionProps) {
  const sheets = useDataImportWizardStore((s) => s.sheets);
  if (sheets.length === 0) return null;

  const showEmptyBuWarning =
    !directoryLoading &&
    businessUnits.length === 0 &&
    fields.some((field) => field.isBusinessUnitController);

  return (
    <section id="import-map" className="ims-panel overflow-hidden scroll-mt-4">
      <div className="ims-panel-header">
        <h2 className="text-sm font-semibold tracking-tight">
          2. Link your data
        </h2>
      </div>
      <div className="space-y-4 px-4 py-4">
        <p className="text-sm text-muted-foreground">
          Required fields (marked *) must be mapped before validation. CSV
          columns that match a field name are linked automatically.{" "}
          <span className="font-medium text-foreground">Business function</span>{" "}
          and owner fields are chosen from your organisation directory — pick a
          business function for each sheet or Validate stays disabled.
        </p>

        {showEmptyBuWarning ? (
          <div
            role="status"
            className="flex gap-2 rounded-md border border-amber-600/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
          >
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300"
              aria-hidden
            />
            <p>
              No business functions are available in this organisation. Create
              at least one business unit before importing — required{" "}
              <span className="font-medium">Business function</span> mappings
              cannot be completed otherwise.
            </p>
          </div>
        ) : null}

        {sheets.map((sheet) => (
          <SheetMappingCard
            key={sheet.id}
            sheet={sheet}
            fields={fields}
            businessUnits={businessUnits}
            users={users}
          />
        ))}
      </div>
    </section>
  );
}
