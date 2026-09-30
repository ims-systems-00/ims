/**
 * Application color theme metadata.
 * Preset token values live in `src/styles/themes.css` via [data-theme="…"] selectors.
 * Custom themes apply derived tokens as inline CSS variables on <html>.
 */

import {
  buildThemeTokensFromHex,
  CUSTOM_THEME_CSS_VARS,
  isValidHexColor,
  normalizeHexColor,
} from "./color-utils";

export const THEME_STORAGE_KEY = "ims-v5-theme";
export const THEME_CUSTOM_HEX_KEY = "ims-v5-theme-custom-hex";
export const DEFAULT_CUSTOM_HEX = "#2563EB";

export const THEME_IDS = [
  "slate",
  "blue",
  "violet",
  "green",
  "orange",
  "rose",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

/** Preset id or the dynamic custom brand theme. */
export type AppliedThemeId = ThemeId | "custom";

export type ThemePreset = {
  id: ThemeId;
  label: string;
  description: string;
  /** Preview swatch for the theme selector (CSS color). */
  swatch: string;
};

export const themeOptions: ThemePreset[] = [
  {
    id: "slate",
    label: "Slate",
    description: "Neutral enterprise default",
    swatch: "#3D4554",
  },
  {
    id: "blue",
    label: "Blue",
    description: "Clear operational focus",
    swatch: "#2563EB",
  },
  {
    id: "violet",
    label: "Violet",
    description: "Refined accent identity",
    swatch: "#7C3AED",
  },
  {
    id: "green",
    label: "Green",
    description: "Calm compliance tone",
    swatch: "#15803D",
  },
  {
    id: "orange",
    label: "Orange",
    description: "Warm operational energy",
    swatch: "#C2410C",
  },
  {
    id: "rose",
    label: "Rose",
    description: "Distinctive brand accent",
    swatch: "#BE123C",
  },
];

export const DEFAULT_THEME_ID: ThemeId = "slate";

export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === "string" &&
    (THEME_IDS as readonly string[]).includes(value)
  );
}

export function isAppliedThemeId(value: unknown): value is AppliedThemeId {
  return isThemeId(value) || value === "custom";
}

export function resolveThemeId(value: unknown): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME_ID;
}

export function resolveAppliedThemeId(value: unknown): AppliedThemeId {
  return isAppliedThemeId(value) ? value : DEFAULT_THEME_ID;
}

function clearCustomThemeVars(
  root: HTMLElement = document.documentElement
): void {
  for (const variable of CUSTOM_THEME_CSS_VARS) {
    root.style.removeProperty(variable);
  }
}

export function applyPresetTheme(
  themeId: ThemeId,
  root: HTMLElement = document.documentElement
): void {
  clearCustomThemeVars(root);
  root.dataset.theme = themeId;
}

/**
 * Apply a custom brand color. Returns false when the hex is invalid.
 */
export function applyCustomTheme(
  hex: string,
  root: HTMLElement = document.documentElement
): boolean {
  const tokens = buildThemeTokensFromHex(hex);
  if (!tokens) return false;

  root.dataset.theme = "custom";
  for (const [property, value] of Object.entries(tokens)) {
    root.style.setProperty(property, value);
  }
  return true;
}

/** @deprecated Prefer applyPresetTheme / applyCustomTheme. */
export function applyTheme(
  themeId: AppliedThemeId,
  root: HTMLElement = document.documentElement,
  customHex?: string
): void {
  if (themeId === "custom") {
    applyCustomTheme(customHex ?? readStoredCustomHex(), root);
    return;
  }
  applyPresetTheme(themeId, root);
}

export function readStoredThemeId(): AppliedThemeId {
  try {
    return resolveAppliedThemeId(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function readStoredCustomHex(): string {
  try {
    const stored = localStorage.getItem(THEME_CUSTOM_HEX_KEY);
    return normalizeHexColor(stored ?? "") ?? DEFAULT_CUSTOM_HEX;
  } catch {
    return DEFAULT_CUSTOM_HEX;
  }
}

export function persistThemeId(themeId: AppliedThemeId): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function persistCustomHex(hex: string): void {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return;
  try {
    localStorage.setItem(THEME_CUSTOM_HEX_KEY, normalized);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export { isValidHexColor, normalizeHexColor };
