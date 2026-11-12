/**
 * Application color themes — ported from V4 `orgTheme.js` / ThemeColorsModal.
 * Presets use the same four brand shades: primary, primaryDark, primaryLight,
 * primaryExtraLight.
 */

import {
  buildThemeTokensFromColors,
  CUSTOM_THEME_CSS_VARS,
  deriveThemeFromPrimary,
  isValidHexColor,
  normalizeHexColor,
  normalizeThemeColors,
  type ThemeColors,
} from "./color-utils";

export const THEME_STORAGE_KEY = "ims-v5-theme";
export const THEME_CUSTOM_COLORS_KEY = "ims-v5-theme-custom-colors";
/** @deprecated Prefer THEME_CUSTOM_COLORS_KEY (full 4-shade palette). */
export const THEME_CUSTOM_HEX_KEY = "ims-v5-theme-custom-hex";

/** Classic light brand palette (unchanged from pre–dark-mode V5). */
export const DEFAULT_THEME_COLORS: ThemeColors = {
  primary: "#0040A3",
  primaryDark: "#002D72",
  primaryLight: "#CCD9ED",
  primaryExtraLight: "#F2F5FA",
};

/** iMS OS brand shades used when appearance is dark. */
export const IMS_OS_DARK_THEME_COLORS: ThemeColors = {
  primary: "#4F39F6",
  primaryDark: "#07091A",
  primaryLight: "#8C7DFF",
  primaryExtraLight: "#F0EEFF",
};

export const DEFAULT_CUSTOM_HEX = DEFAULT_THEME_COLORS.primary;

export const THEME_IDS = [
  "ims-os",
  "ocean-teal",
  "forest",
  "ember",
  "slate",
  "coral",
  "amber",
  "violet",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

/** Preset id or the dynamic custom brand theme. */
export type AppliedThemeId = ThemeId | "custom";

export type ThemePreset = {
  id: ThemeId;
  label: string;
  description: string;
  colors: ThemeColors;
};

/** Organisation colour presets. Default is the official iMS OS brand. */
export const themeOptions: ThemePreset[] = [
  {
    id: "ims-os",
    label: "iMS OS",
    description: "Classic light blue; indigo brand in dark mode",
    colors: { ...DEFAULT_THEME_COLORS },
  },
  {
    id: "ocean-teal",
    label: "Ocean Teal",
    description: "Calm teal operations",
    colors: {
      primary: "#0D9488",
      primaryDark: "#0B3D3A",
      primaryLight: "#5EEAD4",
      primaryExtraLight: "#F0FDFA",
    },
  },
  {
    id: "forest",
    label: "Forest",
    description: "Compliance green",
    colors: {
      primary: "#15803D",
      primaryDark: "#0F2E1C",
      primaryLight: "#86EFAC",
      primaryExtraLight: "#F0FDF4",
    },
  },
  {
    id: "ember",
    label: "Ember",
    description: "Warm copper focus",
    colors: {
      primary: "#C2410C",
      primaryDark: "#1C100A",
      primaryLight: "#FDBA74",
      primaryExtraLight: "#FFF7ED",
    },
  },
  {
    id: "slate",
    label: "Slate",
    description: "Neutral enterprise grey",
    colors: {
      primary: "#475569",
      primaryDark: "#0F172A",
      primaryLight: "#94A3B8",
      primaryExtraLight: "#F8FAFC",
    },
  },
  {
    id: "coral",
    label: "Coral",
    description: "Bold rose accent",
    colors: {
      primary: "#E11D48",
      primaryDark: "#1A0610",
      primaryLight: "#FDA4AF",
      primaryExtraLight: "#FFF1F2",
    },
  },
  {
    id: "amber",
    label: "Amber",
    description: "Warm amber energy",
    colors: {
      primary: "#D97706",
      primaryDark: "#1A1205",
      primaryLight: "#FCD34D",
      primaryExtraLight: "#FFFBEB",
    },
  },
  {
    id: "violet",
    label: "Violet",
    description: "Refined violet accent",
    colors: {
      primary: "#7C3AED",
      primaryDark: "#140B2E",
      primaryLight: "#C4B5FD",
      primaryExtraLight: "#F5F3FF",
    },
  },
];

export const DEFAULT_THEME_ID: ThemeId = "ims-os";

/** Legacy theme ids from earlier V5 / V4 iterations. */
const LEGACY_THEME_ID_MAP: Record<string, ThemeId> = {
  "default-blue": "ims-os",
  blue: "ims-os",
  indigo: "ims-os",
  green: "forest",
  orange: "amber",
  rose: "coral",
};

export function getThemePreset(themeId: ThemeId): ThemePreset {
  const preset = themeOptions.find((theme) => theme.id === themeId);
  return preset ?? themeOptions[0]!;
}

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
  if (isThemeId(value)) return value;
  if (typeof value === "string" && value in LEGACY_THEME_ID_MAP) {
    return LEGACY_THEME_ID_MAP[value]!;
  }
  return DEFAULT_THEME_ID;
}

export function resolveAppliedThemeId(value: unknown): AppliedThemeId {
  if (value === "custom") return "custom";
  return resolveThemeId(value);
}

function clearBrandThemeVars(
  root: HTMLElement = document.documentElement
): void {
  for (const variable of CUSTOM_THEME_CSS_VARS) {
    root.style.removeProperty(variable);
  }
}

function applyThemeColors(
  colors: ThemeColors,
  themeId: AppliedThemeId,
  root: HTMLElement = document.documentElement
): ThemeColors {
  const normalized = normalizeThemeColors(colors, DEFAULT_THEME_COLORS);
  const tokens = buildThemeTokensFromColors(normalized);
  root.dataset.theme = themeId;
  for (const [property, value] of Object.entries(tokens)) {
    root.style.setProperty(property, value);
  }
  return normalized;
}

export function applyPresetTheme(
  themeId: ThemeId,
  root: HTMLElement = document.documentElement,
  appearance: "light" | "dark" = "light"
): void {
  const preset = getThemePreset(themeId);
  const colors =
    appearance === "dark" && themeId === "ims-os"
      ? IMS_OS_DARK_THEME_COLORS
      : preset.colors;
  applyThemeColors(colors, themeId, root);
}

/**
 * Apply a custom 4-shade palette. Returns null when primary is invalid.
 */
export function applyCustomThemeColors(
  colors: Partial<ThemeColors>,
  root: HTMLElement = document.documentElement
): ThemeColors | null {
  const primary = normalizeHexColor(colors.primary ?? "");
  if (!primary) return null;
  const normalized = normalizeThemeColors(
    {
      ...deriveThemeFromPrimary(primary)!,
      ...colors,
      primary,
    },
    DEFAULT_THEME_COLORS
  );
  return applyThemeColors(normalized, "custom", root);
}

/**
 * Apply a custom brand color (derives the other three shades like V4).
 */
export function applyCustomTheme(
  hex: string,
  root: HTMLElement = document.documentElement
): boolean {
  const palette = deriveThemeFromPrimary(hex);
  if (!palette) return false;
  applyThemeColors(palette, "custom", root);
  return true;
}

/** @deprecated Prefer applyPresetTheme / applyCustomThemeColors. */
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

export function readStoredCustomColors(): ThemeColors {
  try {
    const raw = localStorage.getItem(THEME_CUSTOM_COLORS_KEY);
    if (raw) {
      return normalizeThemeColors(
        JSON.parse(raw) as Partial<ThemeColors>,
        DEFAULT_THEME_COLORS
      );
    }
    const legacyHex = localStorage.getItem(THEME_CUSTOM_HEX_KEY);
    const derived = deriveThemeFromPrimary(legacyHex ?? "");
    if (derived) return derived;
  } catch {
    // ignore
  }
  return { ...DEFAULT_THEME_COLORS };
}

export function readStoredCustomHex(): string {
  return readStoredCustomColors().primary;
}

export function persistThemeId(themeId: AppliedThemeId): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function persistCustomColors(colors: ThemeColors): void {
  const normalized = normalizeThemeColors(colors, DEFAULT_THEME_COLORS);
  try {
    localStorage.setItem(
      THEME_CUSTOM_COLORS_KEY,
      JSON.stringify(normalized)
    );
    localStorage.setItem(THEME_CUSTOM_HEX_KEY, normalized.primary);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function persistCustomHex(hex: string): void {
  const palette = deriveThemeFromPrimary(hex);
  if (!palette) return;
  persistCustomColors(palette);
}

/** Clear injected brand vars (tests / reset). */
export function resetBrandThemeVars(
  root: HTMLElement = document.documentElement
): void {
  clearBrandThemeVars(root);
}

export function presetMatchesColors(
  preset: ThemePreset,
  colors: ThemeColors
): boolean {
  const a = normalizeThemeColors(preset.colors, DEFAULT_THEME_COLORS);
  const b = normalizeThemeColors(colors, DEFAULT_THEME_COLORS);
  return (
    a.primary === b.primary &&
    a.primaryDark === b.primaryDark &&
    a.primaryLight === b.primaryLight &&
    a.primaryExtraLight === b.primaryExtraLight
  );
}

export { isValidHexColor, normalizeHexColor, deriveThemeFromPrimary };
export type { ThemeColors };
