/**
 * Setup Guide — tour model.
 *
 * A tour is authored the way the journey demo presents its guide: a short list
 * of chapters, each with an introduction and a handful of numbered points.
 * Every point highlights one real control in the running app.
 *
 * Authors write `TourDefinition`s (see `tours/`). The engine flattens them into
 * `GuideStep`s and hands those to React Joyride.
 */

export type TourPlacement = "auto" | "top" | "bottom" | "left" | "right";

/**
 * One highlighted control inside a chapter.
 *
 * - `explain`: the guide describes the control; Next is always available.
 * - `action`: the user has to do something in the app (`waitFor`). Next stays
 *   locked and the guide moves on by itself once the action happens.
 */
export type TourPoint = {
  id: string;
  kind: "explain" | "action";
  /** CSS selector of the control. Use the stable `[data-tour='…']` hooks. */
  target: string;
  title: string;
  body: string;
  /**
   * Where the app must be for this point, as a path with an optional query
   * (e.g. `/functional-units?create=1`). Defaults to the chapter route.
   * The engine restores exactly this location before showing the point, which
   * is what opens or closes sheets when moving forwards, backwards or jumping.
   * Use `*` for a value that cannot be known in advance: `/risks?risk=*`.
   */
  route?: string;
  /** Preferred side of the control for the guide card. */
  placement?: TourPlacement;
  /** `action` only: event that unlocks the point. See `useTourAction`. */
  waitFor?: string;
  /** `action` only: one-line instruction, e.g. "Click Create a function". */
  actionHint?: string;
  /**
   * `explain` only: optional event that moves the guide on when it happens,
   * without locking Next (e.g. the user actually saved the form).
   */
  advanceOn?: string;
  /** Shown instead of the highlight when the control is not on screen. */
  missingHint?: string;
};

export type TourChapter = {
  id: string;
  /** Short label for the chapter chip, e.g. "Business units". */
  name: string;
  /** Page this chapter lives on, e.g. `/functional-units`. */
  route: string;
  /** Introduction card shown before the chapter's points. */
  title: string;
  body: string;
  points: TourPoint[];
};

export type TourDefinition = {
  id: string;
  title: string;
  description: string;
  /** Nav permission that must be allowed to start this tour. */
  requiredPermission?: string;
  chapters: TourChapter[];
  /** Closing card shown after the last chapter. */
  outro: { title: string; body: string };
};

/** Position of a chapter in the flattened step list (for the chapter chips). */
export type GuideChapterRef = {
  id: string;
  name: string;
  /** Index of the chapter's introduction step. */
  firstStepIndex: number;
};

export type GuideStepKind = "chapter" | "explain" | "action" | "outro";

/** One screen of the guide, in presentation order. */
export type GuideStep = {
  id: string;
  kind: GuideStepKind;
  tourId: string;
  tourTitle: string;
  /** Zero-based; equals `chapterCount` on the outro. */
  chapterIndex: number;
  chapterCount: number;
  chapterName: string;
  /** One-based position among the chapter's points; 0 for intro and outro. */
  pointNumber: number;
  pointCount: number;
  /** Location the app must be at for this step. */
  route: string;
  /** Absent on chapter introductions and the outro (centred cards). */
  target?: string;
  title: string;
  body: string;
  placement: TourPlacement;
  waitFor?: string;
  actionHint?: string;
  advanceOn?: string;
  missingHint?: string;
};

export type FlatTour = {
  tour: TourDefinition;
  steps: GuideStep[];
  chapters: GuideChapterRef[];
};

export type CatalogTourStatus = "available" | "coming_soon";

export type CatalogEntry = {
  id: string;
  title: string;
  description: string;
  status: CatalogTourStatus;
  /** Matches TourDefinition.id when status is available. */
  tourId?: string;
  requiredPermission?: string;
};
