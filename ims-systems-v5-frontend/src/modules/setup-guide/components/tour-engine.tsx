import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  EVENTS,
  LIFECYCLE,
  STATUS,
  useJoyride,
  type EventData,
  type Options,
} from "react-joyride";
import { getFlatTour } from "../catalog";
import { advanceTrigger, isStepLocked } from "../lib/gating";
import { sceneDestination, sceneMatches } from "../lib/route-scene";
import {
  findTarget,
  nextPaint,
  waitForStableTarget,
  waitUntil,
} from "../lib/target-dom";
import { toJoyrideSteps, type StepRuntime } from "../lib/to-joyride-steps";
import { useSetupGuideStore } from "../store";
import type { FlatTour, GuideStep } from "../types";
import { SetupGuideTooltip } from "./setup-guide-tooltip";

/** How long a step waits for the page to reach its location. */
const ROUTE_TIMEOUT_MS = 2000;
/** How long a step waits for its control before showing the fallback card. */
const TARGET_TIMEOUT_MS = 5000;
/** A control must be gone this many checks in a row before the step re-runs. */
const LOST_TARGET_CHECKS = 3;
const LOST_TARGET_INTERVAL_MS = 250;
/** After this many re-runs the step stops retrying and shows the fallback. */
const MAX_RECOVERIES = 2;

const JOYRIDE_OPTIONS: Partial<Options> = {
  skipBeacon: true,
  // The user works in the real app: the highlighted control stays clickable.
  blockTargetInteraction: false,
  overlayClickAction: false,
  // Escape is handled here (it leaves the tour); see the key handler below.
  dismissKeyAction: false,
  // `prepare` has its own, shorter limits and always resolves.
  beforeTimeout: 15_000,
  loaderDelay: 400,
  overlayColor: "rgba(7, 10, 24, 0.55)",
  spotlightPadding: 8,
  spotlightRadius: 8,
  offset: 12,
  // Above sheets and dialogs (z-50), below toasts.
  zIndex: 70,
};

const JOYRIDE_FLOATING = { hideArrow: true };

function themePrimaryColor(): string {
  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim();
  return /^#[\da-f]{3,8}$/i.test(value) ? value : "#0040a3";
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/**
 * Setup Guide host. Mount once inside the application shell.
 *
 * Each run mounts a fresh `TourRunner` (keyed by run id), so a tour always
 * starts from a clean React Joyride instance.
 */
export function TourEngine() {
  const activeTourId = useSetupGuideStore((s) => s.activeTourId);
  const runId = useSetupGuideStore((s) => s.runId);
  const flat = activeTourId ? getFlatTour(activeTourId) : undefined;

  if (!flat) return null;
  return <TourRunner key={runId} flat={flat} />;
}

/**
 * Runs one tour on React Joyride in uncontrolled mode.
 *
 * Joyride owns the step index and lifecycle. This component only:
 * - prepares each step in its `before` hook (restore the app location, wait
 *   for the control to be mounted and still, or flag it as missing);
 * - moves the guide on when the user performs the action a step waits for;
 * - re-runs a step whose control disappears while it is showing;
 * - handles the keyboard (← → to move, Escape to leave).
 */
function TourRunner({ flat }: { flat: FlatTour }) {
  const navigate = useNavigate();
  const location = useLocation();

  // `prepare` runs outside React's render cycle; it reads the latest router
  // state through this ref rather than a stale closure.
  const live = useRef({ navigate, location, mounted: true });
  live.current.navigate = navigate;
  live.current.location = location;

  useEffect(() => {
    const current = live.current;
    current.mounted = true;
    return () => {
      current.mounted = false;
    };
  }, []);

  const recovery = useRef<{ stepId: string | null; count: number }>({
    stepId: null,
    count: 0,
  });

  const missingSteps = useSetupGuideStore((s) => s.missingSteps);
  const completedEvents = useSetupGuideStore((s) => s.completedEvents);
  const setStepIndex = useSetupGuideStore((s) => s.setStepIndex);
  const exitTour = useSetupGuideStore((s) => s.exitTour);
  const finishTour = useSetupGuideStore((s) => s.finishTour);

  const runtime = useMemo<StepRuntime>(
    () => ({
      prepare: async (step: GuideStep) => {
        const store = useSetupGuideStore.getState();

        // A step is always entered with its own events unset, so an action
        // performed earlier in the run cannot unlock or skip it.
        if (step.waitFor) store.clearAction(step.waitFor);
        if (step.advanceOn) store.clearAction(step.advanceOn);

        const destination = sceneDestination(step.route, live.current.location);
        if (destination) {
          live.current.navigate(destination);
          await waitUntil(
            () => sceneMatches(destination, live.current.location),
            ROUTE_TIMEOUT_MS
          );
        }

        if (!step.target || !live.current.mounted) return;

        // A control that keeps vanishing stops being retried automatically;
        // the fallback card offers "Try again", which starts a fresh count.
        const gaveUp =
          recovery.current.stepId === step.id &&
          recovery.current.count >= MAX_RECOVERIES;
        if (gaveUp) recovery.current = { stepId: step.id, count: 0 };
        const found = gaveUp
          ? false
          : await waitForStableTarget(step.target, {
              timeoutMs: TARGET_TIMEOUT_MS,
            });

        if (!live.current.mounted) return;
        const state = useSetupGuideStore.getState();
        if (Boolean(state.missingSteps[step.id]) === found) {
          state.setStepMissing(step.id, !found);
          // Let the swapped step definition reach Joyride before it proceeds.
          await nextPaint();
        }
      },
    }),
    []
  );

  const steps = useMemo(
    () => toJoyrideSteps(flat, missingSteps, runtime),
    [flat, missingSteps, runtime]
  );

  const primaryColor = useMemo(() => themePrimaryColor(), []);
  const options = useMemo(
    () => ({ ...JOYRIDE_OPTIONS, primaryColor }),
    [primaryColor]
  );
  const styles = useMemo(
    () => ({
      spotlight: {
        className: "ims-guide-spotlight",
        stroke: primaryColor,
        strokeWidth: 2,
      },
    }),
    [primaryColor]
  );

  const onEvent = useCallback(
    (data: EventData) => {
      if (data.type !== EVENTS.TOUR_END) return;
      if (data.status === STATUS.FINISHED) finishTour();
      else exitTour();
    },
    [exitTour, finishTour]
  );

  const { Tour, controls, state } = useJoyride({
    steps,
    run: true,
    continuous: true,
    scrollToFirstStep: true,
    tooltipComponent: SetupGuideTooltip,
    floatingOptions: JOYRIDE_FLOATING,
    options,
    styles,
    onEvent,
  });

  const { index, lifecycle, status } = state;
  const current: GuideStep | undefined = flat.steps[index];
  const currentMissing = Boolean(current && missingSteps[current.id]);
  const showing = status === STATUS.RUNNING && lifecycle === LIFECYCLE.TOOLTIP;
  const isLast = index === flat.steps.length - 1;

  // Mirror Joyride's position for the rest of the app (read-only).
  useEffect(() => {
    setStepIndex(index);
    if (recovery.current.stepId !== flat.steps[index]?.id) {
      recovery.current = { stepId: flat.steps[index]?.id ?? null, count: 0 };
    }
  }, [flat, index, setStepIndex]);

  // Hybrid steps: once the awaited in-app action happens, carry on.
  const trigger = current ? advanceTrigger(current) : undefined;
  const triggered = Boolean(trigger && completedEvents[trigger]);
  useEffect(() => {
    if (!showing || !triggered || currentMissing) return;
    const info = controls.info();
    if (info.index !== index || info.lifecycle !== LIFECYCLE.TOOLTIP) return;
    controls.next();
  }, [controls, currentMissing, index, showing, triggered]);

  // If the highlighted control goes away (sheet closed, list re-rendered),
  // run the step again: `prepare` restores the location and finds it, or the
  // step falls back to its centred "not available" card.
  const selector = current?.target;
  const stepId = current?.id;
  useEffect(() => {
    if (!showing || !selector || !stepId || currentMissing) return;
    let misses = 0;
    const timer = window.setInterval(() => {
      if (findTarget(selector)) {
        misses = 0;
        return;
      }
      misses += 1;
      if (misses < LOST_TARGET_CHECKS) return;
      window.clearInterval(timer);

      const info = controls.info();
      if (info.index !== index || info.status !== STATUS.RUNNING) return;
      // An awaited action may be what removed the control; that path wins.
      const events = useSetupGuideStore.getState().completedEvents;
      if (trigger && events[trigger]) return;

      recovery.current =
        recovery.current.stepId === stepId
          ? { stepId, count: recovery.current.count + 1 }
          : { stepId, count: 1 };
      controls.go(index);
    }, LOST_TARGET_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [controls, currentMissing, index, selector, showing, stepId, trigger]);

  // Keyboard: ← → move between steps, Escape leaves the tour.
  const locked = current
    ? isStepLocked(current, completedEvents, currentMissing)
    : false;
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "Escape") {
        exitTour();
        return;
      }
      if (!showing || isEditable(event.target)) return;
      if (event.key === "ArrowRight") {
        if (locked) return;
        if (isLast) finishTour();
        else controls.next();
      } else if (event.key === "ArrowLeft" && index > 0) {
        controls.prev();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [controls, exitTour, finishTour, index, isLast, locked, showing]);

  return Tour;
}
