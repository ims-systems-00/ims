/**
 * Floating layers that must keep working on top of a modal sheet or dialog
 * (Setup Guide spotlight/tooltip, and Alice float panel/FAB).
 *
 * Radix modal layers treat every pointer-down or focus outside their content
 * as a request to dismiss. Guide/Alice render in their own portals, so without
 * this check, clicking them would close the sheet being used alongside.
 */
export const GUIDE_LAYER_SELECTOR = "[data-guide-layer]";
export const ALICE_FLOAT_SELECTOR = "[data-alice-float]";
/** Radix dropdown / menu portals — keep non-modal sheets open while menus close. */
export const MENU_LAYER_SELECTOR =
  "[data-radix-dropdown-menu-content],[data-radix-menu-content],[role='menu']";
/**
 * Nested dialogs (Confirm / Notify / etc.) portal above non-modal sheets.
 * Without this, focus moving into the dialog dismisses the sheet and unmounts
 * the dialog in the same tick.
 */
export const DIALOG_LAYER_SELECTOR =
  "[data-dialog-layer],[role='dialog'],[role='alertdialog']";
/** Select / popover portals opened from inside a sheet. */
export const OVERLAY_PORTAL_LAYER_SELECTOR =
  "[data-radix-select-content],[data-radix-popover-content],[data-radix-popper-content-wrapper]";

/**
 * Clicks on message/prompt text often target a Text node, not an Element.
 * `closest` only exists on Element — walk up so text clicks still count.
 */
export function eventTargetElement(
  target: EventTarget | null | undefined
): Element | null {
  if (target instanceof Element) return target;
  if (target instanceof Text) return target.parentElement;
  return null;
}

export function isInGuideLayer(
  target: EventTarget | null | undefined
): boolean {
  return eventTargetElement(target)?.closest(GUIDE_LAYER_SELECTOR) !== null;
}

export function isInAliceFloatLayer(
  target: EventTarget | null | undefined
): boolean {
  return eventTargetElement(target)?.closest(ALICE_FLOAT_SELECTOR) !== null;
}

export function isInMenuLayer(
  target: EventTarget | null | undefined
): boolean {
  return eventTargetElement(target)?.closest(MENU_LAYER_SELECTOR) !== null;
}

export function isInDialogLayer(
  target: EventTarget | null | undefined
): boolean {
  return eventTargetElement(target)?.closest(DIALOG_LAYER_SELECTOR) !== null;
}

export function isInOverlayPortalLayer(
  target: EventTarget | null | undefined
): boolean {
  return (
    eventTargetElement(target)?.closest(OVERLAY_PORTAL_LAYER_SELECTOR) !==
    null
  );
}

type OutsideInteractionEvent = {
  target: EventTarget | null;
  detail?: { originalEvent?: { target: EventTarget | null } };
  preventDefault: () => void;
};

function resolveOutsideTarget(
  event: OutsideInteractionEvent
): EventTarget | null {
  return event.detail?.originalEvent?.target ?? event.target;
}

/**
 * Use as (part of) `onInteractOutside` on Radix dialog content: interactions
 * that land on the guide layer never dismiss the dialog.
 */
export function keepOpenForGuideLayer(event: OutsideInteractionEvent): void {
  if (isInGuideLayer(resolveOutsideTarget(event))) {
    event.preventDefault();
  }
}

/**
 * Keep sheets/dialogs open when the user interacts with Alice’s float panel
 * or FAB (same pattern as the Setup Guide layer).
 */
export function keepOpenForAliceFloat(event: OutsideInteractionEvent): void {
  if (isInAliceFloatLayer(resolveOutsideTarget(event))) {
    event.preventDefault();
  }
}

export function keepOpenForMenuLayer(event: OutsideInteractionEvent): void {
  if (isInMenuLayer(resolveOutsideTarget(event))) {
    event.preventDefault();
  }
}

export function keepOpenForDialogLayer(event: OutsideInteractionEvent): void {
  if (isInDialogLayer(resolveOutsideTarget(event))) {
    event.preventDefault();
  }
}

export function keepOpenForOverlayPortalLayer(
  event: OutsideInteractionEvent
): void {
  if (isInOverlayPortalLayer(resolveOutsideTarget(event))) {
    event.preventDefault();
  }
}

/** Combined dismiss guard for sheets/dialogs that sit beside Alice / the guide. */
export function keepOpenForFloatingLayers(
  event: OutsideInteractionEvent
): void {
  keepOpenForGuideLayer(event);
  keepOpenForAliceFloat(event);
  keepOpenForMenuLayer(event);
  keepOpenForDialogLayer(event);
  keepOpenForOverlayPortalLayer(event);
}
