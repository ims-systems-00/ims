/**
 * Light / dark appearance mode (separate from colour presets).
 */

export const APPEARANCE_STORAGE_KEY = "ims-v5-appearance";

export const APPEARANCE_MODES = ["light", "dark"] as const;
export type AppearanceMode = (typeof APPEARANCE_MODES)[number];

export const DEFAULT_APPEARANCE_MODE: AppearanceMode = "light";

export function isAppearanceMode(value: unknown): value is AppearanceMode {
  return (
    typeof value === "string" &&
    (APPEARANCE_MODES as readonly string[]).includes(value)
  );
}

export function resolveAppearanceMode(value: unknown): AppearanceMode {
  return isAppearanceMode(value) ? value : DEFAULT_APPEARANCE_MODE;
}

export function readStoredAppearanceMode(): AppearanceMode {
  try {
    return resolveAppearanceMode(localStorage.getItem(APPEARANCE_STORAGE_KEY));
  } catch {
    return DEFAULT_APPEARANCE_MODE;
  }
}

export function persistAppearanceMode(mode: AppearanceMode): void {
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, mode);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function applyAppearanceMode(
  mode: AppearanceMode,
  root: HTMLElement = document.documentElement
): void {
  root.classList.toggle("dark", mode === "dark");
  root.dataset.appearance = mode;
  root.style.colorScheme = mode;
}
