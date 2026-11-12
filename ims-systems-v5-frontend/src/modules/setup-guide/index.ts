/**
 * Setup Guide — in-app guided tours on React Joyride.
 *
 * - `ModulePickerDialog` + `TourEngine` are mounted once in the app shell.
 * - Modules mark controls with `data-tour="…"` and report user actions with
 *   `useTourAction` / `signalTourAction`.
 * - Tours are authored in `tours/` and registered in `catalog.ts`.
 */

export { ModulePickerDialog } from "./components/module-picker-dialog";
export { TourEngine } from "./components/tour-engine";
export { useTourAction } from "./hooks/use-tour-action";
export { signalTourAction, useSetupGuideStore } from "./store";
export {
  SETUP_GUIDE_CATALOG,
  getFlatTour,
  getTourById,
  listShippedTours,
} from "./catalog";
export type {
  CatalogEntry,
  FlatTour,
  GuideStep,
  TourChapter,
  TourDefinition,
  TourPoint,
} from "./types";
