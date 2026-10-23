import { create } from "zustand";
import type {
  ImportableModule,
  ImportDateFormat,
  ImportDataMap,
  ParsedSheet,
  ValidationOutcome,
} from "../types";

export type WizardPhase =
  | "configure"
  | "map"
  | "validate"
  | "migrate"
  | "done";

type DataImportWizardState = {
  phase: WizardPhase;
  module: ImportableModule | "";
  dateFormat: ImportDateFormat;
  sheets: ParsedSheet[];
  confirmText: string;
  submitting: boolean;
  setModule: (module: ImportableModule | "") => void;
  setDateFormat: (format: ImportDateFormat) => void;
  addSheet: (sheet: ParsedSheet) => void;
  removeSheet: (id: string) => void;
  setFieldMapping: (
    sheetId: string,
    path: string,
    value: string | null
  ) => void;
  setFieldExcluded: (
    sheetId: string,
    path: string,
    excluded: boolean
  ) => void;
  setSheetValidation: (sheetId: string, validation: ValidationOutcome) => void;
  /** Fill unmapped CSV fields from header suggestions (does not overwrite). */
  applySuggestedMappings: (
    suggestionsBySheetId: Record<string, ImportDataMap>
  ) => void;
  clearValidations: () => void;
  setConfirmText: (value: string) => void;
  setSubmitting: (value: boolean) => void;
  setPhase: (phase: WizardPhase) => void;
  reset: () => void;
};

const initial = {
  phase: "configure" as WizardPhase,
  module: "" as const,
  dateFormat: "DD/MM/YYYY" as ImportDateFormat,
  sheets: [] as ParsedSheet[],
  confirmText: "",
  submitting: false,
};

function withClearedValidation(sheet: ParsedSheet): ParsedSheet {
  const next = { ...sheet };
  delete next.validation;
  return next;
}

export const useDataImportWizardStore = create<DataImportWizardState>(
  (set) => ({
    ...initial,
    module: "",

    setModule: (module) =>
      set((state) => ({
        module,
        sheets: state.sheets.map(withClearedValidation),
        phase:
          state.sheets.length > 0
            ? "map"
            : ("configure" as WizardPhase),
        confirmText: "",
      })),

    setDateFormat: (dateFormat) => set({ dateFormat }),

    addSheet: (sheet) =>
      set((state) => ({
        sheets: [...state.sheets, sheet],
        phase: "map",
        confirmText: "",
      })),

    removeSheet: (id) =>
      set((state) => {
        const sheets = state.sheets.filter((s) => s.id !== id);
        return {
          sheets,
          phase: sheets.length === 0 ? "configure" : state.phase,
          confirmText: "",
        };
      }),

    setFieldMapping: (sheetId, path, value) =>
      set((state) => ({
        sheets: state.sheets.map((sheet) => {
          if (sheet.id !== sheetId) return sheet;
          const dataMap: ImportDataMap = { ...sheet.dataMap };
          if (!value) delete dataMap[path];
          else dataMap[path] = value;
          return withClearedValidation({ ...sheet, dataMap });
        }),
        confirmText: "",
      })),

    setFieldExcluded: (sheetId, path, excluded) =>
      set((state) => ({
        sheets: state.sheets.map((sheet) => {
          if (sheet.id !== sheetId) return sheet;
          const excludedPaths = excluded
            ? [...new Set([...sheet.excludedPaths, path])]
            : sheet.excludedPaths.filter((p) => p !== path);
          const dataMap = { ...sheet.dataMap };
          if (excluded) delete dataMap[path];
          return withClearedValidation({ ...sheet, excludedPaths, dataMap });
        }),
        confirmText: "",
      })),

    setSheetValidation: (sheetId, validation) =>
      set((state) => ({
        sheets: state.sheets.map((sheet) =>
          sheet.id === sheetId ? { ...sheet, validation } : sheet
        ),
      })),

    applySuggestedMappings: (suggestionsBySheetId) =>
      set((state) => {
        let anyChanged = false;
        const sheets = state.sheets.map((sheet) => {
          const suggestions = suggestionsBySheetId[sheet.id];
          if (!suggestions || Object.keys(suggestions).length === 0) {
            return sheet;
          }
          const dataMap: ImportDataMap = { ...sheet.dataMap };
          let changed = false;
          for (const [path, column] of Object.entries(suggestions)) {
            if (dataMap[path]) continue;
            if (sheet.excludedPaths.includes(path)) continue;
            dataMap[path] = column;
            changed = true;
          }
          if (!changed) return sheet;
          anyChanged = true;
          return withClearedValidation({ ...sheet, dataMap });
        });
        return anyChanged ? { sheets } : state;
      }),

    clearValidations: () =>
      set((state) => ({
        sheets: state.sheets.map(withClearedValidation),
        confirmText: "",
      })),

    setConfirmText: (confirmText) => set({ confirmText }),
    setSubmitting: (submitting) => set({ submitting }),
    setPhase: (phase) => set({ phase }),

    reset: () => set({ ...initial, module: "", sheets: [] }),
  })
);

/** Active dataMap for a sheet (excludes opted-out optional fields). */
export function activeDataMap(sheet: ParsedSheet): ImportDataMap {
  const map: ImportDataMap = {};
  for (const [path, value] of Object.entries(sheet.dataMap)) {
    if (sheet.excludedPaths.includes(path)) continue;
    map[path] = value;
  }
  return map;
}
