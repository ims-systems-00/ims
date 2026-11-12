import type {
  FlatTour,
  GuideChapterRef,
  GuideStep,
  TourDefinition,
} from "../types";

/**
 * Turn an authored tour (chapters with points) into the ordered list of
 * screens the guide shows: chapter introduction, its points, …, outro.
 *
 * Throws on authoring mistakes so a broken tour fails in tests, not in front
 * of a user.
 */
export function flattenTour(tour: TourDefinition): FlatTour {
  if (tour.chapters.length === 0) {
    throw new Error(`Setup Guide tour "${tour.id}" has no chapters.`);
  }

  const steps: GuideStep[] = [];
  const chapters: GuideChapterRef[] = [];
  const seenIds = new Set<string>();
  const chapterCount = tour.chapters.length;

  function push(step: GuideStep) {
    if (seenIds.has(step.id)) {
      throw new Error(
        `Setup Guide tour "${tour.id}" has a duplicate step id "${step.id}".`
      );
    }
    seenIds.add(step.id);
    steps.push(step);
  }

  tour.chapters.forEach((chapter, chapterIndex) => {
    const base = {
      tourId: tour.id,
      tourTitle: tour.title,
      chapterIndex,
      chapterCount,
      chapterName: chapter.name,
      pointCount: chapter.points.length,
    };

    chapters.push({
      id: chapter.id,
      name: chapter.name,
      firstStepIndex: steps.length,
    });

    push({
      ...base,
      id: `${tour.id}.${chapter.id}`,
      kind: "chapter",
      pointNumber: 0,
      route: chapter.route,
      title: chapter.title,
      body: chapter.body,
      placement: "auto",
    });

    chapter.points.forEach((point, pointIndex) => {
      if (point.kind === "action" && !point.waitFor) {
        throw new Error(
          `Setup Guide point "${point.id}" is an action but has no waitFor event.`
        );
      }
      if (point.kind === "explain" && point.waitFor) {
        throw new Error(
          `Setup Guide point "${point.id}" has waitFor but is not an action.`
        );
      }
      push({
        ...base,
        id: `${tour.id}.${chapter.id}.${point.id}`,
        kind: point.kind,
        pointNumber: pointIndex + 1,
        route: point.route ?? chapter.route,
        target: point.target,
        title: point.title,
        body: point.body,
        placement: point.placement ?? "auto",
        waitFor: point.waitFor,
        actionHint: point.actionHint,
        advanceOn: point.advanceOn,
        missingHint: point.missingHint,
      });
    });
  });

  const lastChapter = tour.chapters[chapterCount - 1];
  if (!lastChapter) {
    throw new Error(`Setup Guide tour "${tour.id}" has no chapters.`);
  }
  push({
    id: `${tour.id}.outro`,
    kind: "outro",
    tourId: tour.id,
    tourTitle: tour.title,
    chapterIndex: chapterCount,
    chapterCount,
    chapterName: "",
    pointNumber: 0,
    pointCount: 0,
    route: lastChapter.route,
    title: tour.outro.title,
    body: tour.outro.body,
    placement: "auto",
  });

  return { tour, steps, chapters };
}
