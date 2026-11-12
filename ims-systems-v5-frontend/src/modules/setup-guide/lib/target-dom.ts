/**
 * DOM helpers for locating the control a guide step highlights.
 */

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isRendered(element: Element): boolean {
  let node: Element | null = element;
  while (node && node !== document.body) {
    const { display, visibility } = window.getComputedStyle(node);
    if (display === "none" || visibility === "hidden") return false;
    node = node.parentElement;
  }
  return true;
}

/** The step's control, if it is mounted and not hidden. */
export function findTarget(selector: string): HTMLElement | null {
  let element: Element | null = null;
  try {
    element = document.querySelector(selector);
  } catch {
    return null;
  }
  if (!(element instanceof HTMLElement)) return null;
  return isRendered(element) ? element : null;
}

function rectKey(element: Element): string {
  const rect = element.getBoundingClientRect();
  return [rect.left, rect.top, rect.width, rect.height]
    .map((value) => Math.round(value))
    .join(":");
}

export type WaitForTargetOptions = {
  /** Give up after this long and report the control as missing. */
  timeoutMs?: number;
  /** Sampling interval. */
  intervalMs?: number;
  /** Consecutive identical samples required before the control is "still". */
  stableSamples?: number;
};

/**
 * Wait until the control is mounted, visible and no longer moving.
 *
 * Sheets and dialogs slide in, so a control that exists is not necessarily
 * where it will end up. Highlighting it mid-animation leaves the spotlight in
 * the wrong place, so this resolves only once its box has stopped changing.
 * Resolves `false` when the control never appears.
 */
export async function waitForStableTarget(
  selector: string,
  options: WaitForTargetOptions = {}
): Promise<boolean> {
  const { timeoutMs = 5000, intervalMs = 50, stableSamples = 3 } = options;
  const deadline = Date.now() + timeoutMs;
  let lastKey: string | null = null;
  let lastElement: Element | null = null;
  let streak = 0;

  for (;;) {
    const element = findTarget(selector);
    if (element) {
      const key = rectKey(element);
      if (element === lastElement && key === lastKey) {
        streak += 1;
      } else {
        streak = 1;
        lastKey = key;
        lastElement = element;
      }
      if (streak >= stableSamples) return true;
    } else {
      streak = 0;
      lastKey = null;
      lastElement = null;
    }

    if (Date.now() >= deadline) return false;
    await delay(intervalMs);
  }
}

/** Poll `check` until it is true or the timeout passes. */
export async function waitUntil(
  check: () => boolean,
  timeoutMs: number,
  intervalMs = 30
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (check()) return true;
    if (Date.now() >= deadline) return false;
    await delay(intervalMs);
  }
}

/** Let React commit and the browser paint pending state. */
export function nextPaint(): Promise<void> {
  return delay(34);
}
