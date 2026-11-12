import { findTarget } from "./target-dom";

export type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type SpotlightTarget = {
  rect: SpotlightRect;
  label?: string;
  labelAbove: boolean;
};

const PADDING = 8;

/** Measure the control for the fixed spotlight overlay. */
export function measureSpotlight(
  selector: string | undefined,
  label: string | undefined,
  labelAbove = false
): SpotlightTarget | null {
  if (!selector) return null;
  const el = findTarget(selector);
  if (!el) return null;
  const box = el.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return null;
  return {
    rect: {
      top: box.top - PADDING,
      left: box.left - PADDING,
      width: box.width + PADDING * 2,
      height: box.height + PADDING * 2,
    },
    label,
    labelAbove,
  };
}
