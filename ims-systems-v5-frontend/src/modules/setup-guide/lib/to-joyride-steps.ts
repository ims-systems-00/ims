import type { Step } from "react-joyride";
import type { FlatTour, GuideChapterRef, GuideStep } from "../types";
import { findTarget } from "./target-dom";

/** Payload carried on each Joyride step for the guide card. */
export type GuideStepData = {
  step: GuideStep;
  chapters: GuideChapterRef[];
  /** The step's control was not on screen; it is shown as a centred card. */
  missing: boolean;
};

export type StepRuntime = {
  /** Put the app in the state the step needs and locate its control. */
  prepare: (step: GuideStep) => Promise<void>;
};

/**
 * Map guide steps to React Joyride steps.
 *
 * - Every step gets a `before` hook, so Joyride waits for the app to be ready
 *   instead of measuring a control that is still animating or not mounted.
 * - Steps without a control (chapter introductions, outro) and steps whose
 *   control is missing render as centred cards rather than being skipped.
 */
export function toJoyrideSteps(
  flat: FlatTour,
  missingSteps: Record<string, true>,
  runtime: StepRuntime
): Step[] {
  return flat.steps.map((step) => {
    const selector = step.target;
    const missing = Boolean(selector && missingSteps[step.id]);
    const centred = !selector || missing;
    const data: GuideStepData = { step, chapters: flat.chapters, missing };

    return {
      id: step.id,
      title: step.title,
      content: step.body,
      data,
      // Falling back to <body> keeps Joyride from silently skipping the step
      // if the control disappears between `before` resolving and rendering.
      target:
        centred || !selector
          ? "body"
          : () => findTarget(selector) ?? document.body,
      placement: centred ? "center" : step.placement,
      before: () => runtime.prepare(step),
    } satisfies Step;
  });
}
