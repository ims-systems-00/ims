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

export const DEFAULT_THEME_COLORS: ThemeColors = {
  primary: "#0040A3",
  primaryDark: "#002D72",
  primaryLight: "#CCD9ED",
  primaryExtraLight: "#F2F5FA",
};

export const DEFAULT_CUSTOM_HEX = DEFAULT_THEME_COLORS.primary;

export const THEME_IDS = [
  "default-blue",
  "ocean-teal",
  "forest",
  "indigo",
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

/** V4 organisation theme templates. */
export const themeOptions: ThemePreset[] = [
  {
    id: "default-blue",
    label: "Default Blue",
    description: "Classic iMS brand blue",
    colors: { ...DEFAULT_THEME_COLORS },
  },
  {
    id: "ocean-teal",
    label: "Ocean Teal",
    description: "Calm teal operations",
    colors: {
      primary: "#0D9488",
      primaryDark: "#0F766E",
      primaryLight: "#99F6E4",
      primaryExtraLight: "#F0FDFA",
    },
  },
  {
    id: "forest",
    label: "Forest",
    description: "Compliance green",
    colors: {
      primary: "#15803D",
      primaryDark: "#166534",
      primaryLight: "#BBF7D0",
      primaryExtraLight: "#F0FDF4",
    },
  },
  {
    id: "indigo",
    label: "Indigo",
    description: "Deep indigo focus",
    colors: {
      primary: "#4F46E5",
      primaryDark: "#3730A3",
      primaryLight: "#C7D2FE",
      primaryExtraLight: "#EEF2FF",
    },
  },
  {
    id: "slate",
    label: "Slate",
    description: "Neutral enterprise grey",
    colors: {
      primary: "#475569",
      primaryDark: "#334155",
      primaryLight: "#CBD5E1",
      primaryExtraLight: "#F8FAFC",
    },
  },
  {
    id: "coral",
    label: "Coral",
    description: "Bold rose accent",
    colors: {
      primary: "#E11D48",
      primaryDark: "#9A041F",
      primaryLight: "#FECDD3",
      primaryExtraLight: "#FFF1F2",
    },
  },
  {
    id: "amber",
    label: "Amber",
    description: "Warm amber energy",
    colors: {
      primary: "#D97706",
      primaryDark: "#B45309",
      primaryLight: "#FDE68A",
      primaryExtraLight: "#FFFBEB",
    },
  },
  {
    id: "violet",
    label: "Violet",
    description: "Refined violet accent",
    colors: {
      primary: "#7C3AED",
      primaryDark: "#5B21B6",
      primaryLight: "#DDD6FE",
      primaryExtraLight: "#F5F3FF",
    },
  },
];

export const DEFAULT_THEME_ID: ThemeId = "default-blue";

/** Legacy single-hex theme ids from earlier V5 iterations. */
const LEGACY_THEME_ID_MAP: Record<string, ThemeId> = {
  blue: "default-blue",
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
  root: HTMLElement = document.documentElement
): void {
  const preset = getThemePreset(themeId);
  applyThemeColors(preset.colors, themeId, root);
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
