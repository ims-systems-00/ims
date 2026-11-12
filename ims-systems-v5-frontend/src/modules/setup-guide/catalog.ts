import { flattenTour } from "./lib/flatten-tour";
import { organisationTour } from "./tours/organisation";
import type { CatalogEntry, FlatTour, TourDefinition } from "./types";

/**
 * Tours that are built and ready to run.
 *
 * To add one:
 * 1. Write `tours/<name>.ts` (chapters → points) — see `tours/organisation.ts`.
 * 2. Add `data-tour` hooks to the controls it highlights, and signal the
 *    actions it waits for with `useTourAction` / `signalTourAction`.
 * 3. Register it here and flip its catalog entry to `available`.
 * `tests/setup-guide-tours.test.ts` then checks its hooks exist in the app.
 */
const TOURS: TourDefinition[] = [organisationTour];

const TOUR_BY_ID = new Map(TOURS.map((tour) => [tour.id, tour]));
const FLAT_BY_ID = new Map<string, FlatTour>();

/** Module picker entries — shipped tours + coming-soon placeholders. */
export const SETUP_GUIDE_CATALOG: CatalogEntry[] = [
  {
    id: "organisation",
    title: "Organisation",
    description:
      "Business units, users and premises — the structure everything else rolls up from.",
    status: "available",
    tourId: "organisation",
    requiredPermission: "functional-units:read",
  },
  {
    id: "documents",
    title: "Documents",
    description:
      "Create repositories and bring policies into controlled document management.",
    status: "coming_soon",
    requiredPermission: "document-management:read",
  },
  {
    id: "risks",
    title: "Risks",
    description: "Raise, score, and analyse risks with Alice.",
    status: "coming_soon",
    requiredPermission: "risks:read",
  },
  {
    id: "compliance",
    title: "Compliance / SoA",
    description: "Statement of Applicability and control evidence.",
    status: "coming_soon",
    requiredPermission: "compliance:read",
  },
  {
    id: "audits",
    title: "Internal audits",
    description: "Schedule the audit programme and record findings.",
    status: "coming_soon",
    requiredPermission: "audits:read",
  },
  {
    id: "reviews",
    title: "Management review",
    description: "Schedule reviews with agenda, minutes, and actions.",
    status: "coming_soon",
    requiredPermission: "management-reviews:read",
  },
  {
    id: "alice",
    title: "Alice",
    description: "Ask Alice across the organisation and stay ahead of work.",
    status: "coming_soon",
  },
];

export function getTourById(tourId: string): TourDefinition | undefined {
  return TOUR_BY_ID.get(tourId);
}

/** The tour as the ordered list of screens the guide shows. */
export function getFlatTour(tourId: string): FlatTour | undefined {
  const cached = FLAT_BY_ID.get(tourId);
  if (cached) return cached;
  const tour = TOUR_BY_ID.get(tourId);
  if (!tour) return undefined;
  const flat = flattenTour(tour);
  FLAT_BY_ID.set(tourId, flat);
  return flat;
}

export function listShippedTours(): TourDefinition[] {
  return TOURS;
}
