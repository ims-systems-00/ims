import { useEffect, useMemo } from "react";
import { CheckCircle2, Import } from "lucide-react";
import { useFunctionalUnitsQuery } from "@/modules/functional-units/hooks/use-functional-units";
import { isBusinessAccessType } from "@/modules/functional-units/types";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import { PageHeader } from "@/shared/layout";
import { Button } from "@/shared/components/ui/button";
import { WizardConfigSection } from "../components/wizard-config-section";
import { WizardMappingSection } from "../components/wizard-mapping-section";
import { WizardMigrateSection } from "../components/wizard-migrate-section";
import { WizardSteps, type WizardStepId } from "../components/wizard-steps";
import { WizardValidationSection } from "../components/wizard-validation-section";
import {
  useImportModulesQuery,
  useImportSchemaQuery,
} from "../hooks/use-data-import";
import { missingRequiredFields, suggestColumnMappings } from "../lib/auto-map";
import {
  activeDataMap,
  useDataImportWizardStore,
} from "../store/data-import-wizard-store";
import type { ImportableModule } from "../types";

/**
 * Standalone Data Import wizard — sidebar → Data Import.
 * Spec: docs/module-specifications/data-import.md
 */
export function DataImportPage() {
  const phase = useDataImportWizardStore((s) => s.phase);
  const module = useDataImportWizardStore((s) => s.module);
  const sheets = useDataImportWizardStore((s) => s.sheets);
  const reset = useDataImportWizardStore((s) => s.reset);
  const applySuggestedMappings = useDataImportWizardStore(
    (s) => s.applySuggestedMappings
  );

  const modulesQuery = useImportModulesQuery();
  const schemaQuery = useImportSchemaQuery(
    (module || null) as ImportableModule | null,
    Boolean(module)
  );
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });

  const businessUnits = useMemo(
    () =>
      (unitsQuery.data?.items ?? [])
        .filter((unit) => isBusinessAccessType(unit.accessType))
        .map((unit) => ({ id: unit.id, label: unit.name })),
    [unitsQuery.data?.items]
  );

  const users = useMemo(
    () =>
      (usersQuery.data?.items ?? []).map((row) => ({
        id: row.user.id,
        label: row.user.name || row.user.email,
      })),
    [usersQuery.data?.items]
  );

  const fields = schemaQuery.data?.schema ?? [];
  const modules = modulesQuery.data ?? [];

  const sheetSignature = sheets
    .map((sheet) => `${sheet.id}:${sheet.columns.join("|")}`)
    .join(";");
  const fieldSignature = fields.map((field) => field.path).join(",");

  // Auto-map CSV headers that match field aliases (e.g. "Risk title").
  // Business function / owner still need a manual org-directory pick.
  useEffect(() => {
    if (fields.length === 0 || sheets.length === 0) return;
    const suggestionsBySheetId: Record<
      string,
      ReturnType<typeof suggestColumnMappings>
    > = {};
    for (const sheet of sheets) {
      suggestionsBySheetId[sheet.id] = suggestColumnMappings(
        sheet.columns,
        fields
      );
    }
    applySuggestedMappings(suggestionsBySheetId);
    // sheets/fields objects change often; signatures gate the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [sheetSignature, fieldSignature, applySuggestedMappings]);

  const mappingsReady =
    sheets.length > 0 &&
    fields.length > 0 &&
    sheets.every(
      (sheet) =>
        missingRequiredFields(fields, activeDataMap(sheet), sheet.excludedPaths)
          .length === 0
    );
  const validationPassed =
    sheets.length > 0 &&
    sheets.every((sheet) => sheet.validation?.success === true);

  const wizardCurrent: WizardStepId =
    phase === "migrate" || validationPassed
      ? 4
      : mappingsReady
        ? 3
        : sheets.length > 0 && module
          ? 2
          : 1;

  const wizardCompleted: WizardStepId[] = [];
  if (sheets.length > 0 && module) wizardCompleted.push(1);
  if (mappingsReady) wizardCompleted.push(2);
  if (validationPassed) wizardCompleted.push(3);

  if (phase === "done") {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader
          title="Data Import"
          description="Bulk-load records from a CSV into iMS modules."
        />
        <section className="ims-panel overflow-hidden">
          <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <CheckCircle2
              className="size-12 text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight">
                Congratulations — all done now
              </h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Migration has started. Alice will import your data in the
                background. You will receive an in-app notification when it
                completes.
              </p>
            </div>
            <Button type="button" onClick={() => reset()}>
              Import more data
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-8xl space-y-5">
      <PageHeader
        title="Data Import"
        description="Upload a CSV, map columns to iMS fields, validate, then migrate in the background."
      />

      <div className="ims-panel px-4 py-3">
        <WizardSteps current={wizardCurrent} completed={wizardCompleted} />
      </div>

      <WizardConfigSection
        modules={modules}
        modulesLoading={modulesQuery.isLoading}
      />

      {sheets.length > 0 && module ? (
        <>
          {schemaQuery.isLoading ? (
            <section className="ims-panel px-4 py-6 text-sm text-muted-foreground">
              Loading importable fields…
            </section>
          ) : schemaQuery.isError ? (
            <section className="ims-panel px-4 py-6 text-sm text-destructive">
              Could not load the schema for this module.
            </section>
          ) : (
            <>
              <WizardMappingSection
                fields={fields}
                businessUnits={businessUnits}
                users={users}
                directoryLoading={unitsQuery.isLoading}
              />
              <WizardValidationSection fields={fields} />
              <WizardMigrateSection />
            </>
          )}
        </>
      ) : (
        <section className="ims-panel px-4 py-8 text-center text-sm text-muted-foreground">
          <Import className="mx-auto mb-2 size-5 opacity-60" aria-hidden />
          Choose a module and upload at least one CSV to continue.
        </section>
      )}
    </div>
  );
}
