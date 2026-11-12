/**
 * Guide layer — floating UI that must keep working on top of a modal sheet or
 * dialog (the Setup Guide spotlight and its tooltip).
 *
 * Radix modal layers treat every pointer-down or focus outside their content
 * as a request to dismiss. The guide renders in its own portal, so without this
 * check, pressing "Next" in the guide would close the sheet being explained.
 */
export const GUIDE_LAYER_SELECTOR = "[data-guide-layer], #react-joyride-portal";

export function isInGuideLayer(
  target: EventTarget | null | undefined
): boolean {
  return (
    target instanceof Element && target.closest(GUIDE_LAYER_SELECTOR) !== null
  );
}

type OutsideInteractionEvent = {
  target: EventTarget | null;
  detail?: { originalEvent?: { target: EventTarget | null } };
  preventDefault: () => void;
};

/**
 * Use as (part of) `onInteractOutside` on Radix dialog content: interactions
 * that land on the guide layer never dismiss the dialog.
 */
export function keepOpenForGuideLayer(event: OutsideInteractionEvent): void {
  const target = event.detail?.originalEvent?.target ?? event.target;
  if (isInGuideLayer(target)) {
    event.preventDefault();
  }
}
