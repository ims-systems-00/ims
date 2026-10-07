/**
 * V4-compatible org theme helpers (primary / primaryDark / light / extra-light).
 */

export const HEX_COLOR_PATTERN = /^#([0-9A-Fa-f]{6})$/;

export type ThemeColors = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryExtraLight: string;
};

export type HslColor = {
  h: number;
  s: number;
  l: number;
};

/** Normalize user input to `#RRGGBB` or null when invalid. */
export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  // Require full 6-digit hex so partial typing (e.g. "#be1") is not expanded.
  if (!HEX_COLOR_PATTERN.test(withHash)) return null;
  return withHash.toUpperCase();
}

export function isValidHexColor(value: string): boolean {
  return normalizeHexColor(value) !== null;
}

export function hexToHsl(hex: string): HslColor {
  const normalized = normalizeHexColor(hex);
  if (!normalized) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const r = Number.parseInt(normalized.slice(1, 3), 16) / 255;
  const g = Number.parseInt(normalized.slice(3, 5), 16) / 255;
  const b = Number.parseInt(normalized.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h: Math.round(h * 10) / 10,
    s: Math.round(s * 1000) / 10,
    l: Math.round(l * 1000) / 10,
  };
}

/** Relative luminance (0–1) for contrast decisions. */
export function hexLuminance(hex: string): number {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return 0;

  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };

  const r = channel(Number.parseInt(normalized.slice(1, 3), 16));
  const g = channel(Number.parseInt(normalized.slice(3, 5), 16));
  const b = channel(Number.parseInt(normalized.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function clampByte(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${[r, g, b]
    .map((v) => clampByte(v).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

/** Mix `hex` toward `target` by `amount` (0–1). Matches V4 orgTheme. */
export function mixHex(hex: string, target: string, amount: number): string {
  const from = hexToRgb(hex);
  const to = hexToRgb(target);
  if (!from || !to) return normalizeHexColor(hex) ?? "#000000";
  return rgbToHex({
    r: from.r + (to.r - from.r) * amount,
    g: from.g + (to.g - from.g) * amount,
    b: from.b + (to.b - from.b) * amount,
  });
}

/**
 * Derive a full 4-shade palette from a single primary hex (V4 algorithm).
 */
export function deriveThemeFromPrimary(primaryHex: string): ThemeColors | null {
  const primary = normalizeHexColor(primaryHex);
  if (!primary) return null;
  return {
    primary,
    primaryDark: mixHex(primary, "#000000", 0.28),
    primaryLight: mixHex(primary, "#FFFFFF", 0.72),
    primaryExtraLight: mixHex(primary, "#FFFFFF", 0.92),
  };
}

export function normalizeThemeColors(
  colors: Partial<ThemeColors> | null | undefined,
  fallback: ThemeColors
): ThemeColors {
  const source = colors ?? {};
  return {
    primary: normalizeHexColor(source.primary ?? "") ?? fallback.primary,
    primaryDark:
      normalizeHexColor(source.primaryDark ?? "") ?? fallback.primaryDark,
    primaryLight:
      normalizeHexColor(source.primaryLight ?? "") ?? fallback.primaryLight,
    primaryExtraLight:
      normalizeHexColor(source.primaryExtraLight ?? "") ??
      fallback.primaryExtraLight,
  };
}

/**
 * Map V4 brand shades onto V5 design tokens.
 * - primary → buttons / active chrome
 * - primaryDark → sidebar background (V4 sidebar base)
 * - primaryLight / primaryExtraLight → soft accents
 */
export function buildThemeTokensFromColors(
  colors: ThemeColors
): Record<string, string> {
  const primary = colors.primary;
  const primaryDark = colors.primaryDark;
  const primaryLight = colors.primaryLight;
  const primaryExtraLight = colors.primaryExtraLight;

  const onPrimary = hexLuminance(primary) > 0.45 ? "#111827" : "#FAFAFA";
  const onSidebar = hexLuminance(primaryDark) > 0.45 ? "#111827" : "#FAFAFA";
  const mutedOnSidebar =
    hexLuminance(primaryDark) > 0.45
      ? mixHex(primaryDark, "#000000", 0.35)
      : mixHex(primaryDark, "#FFFFFF", 0.55);

  return {
    "--primary": primary,
    "--primary-foreground": onPrimary,
    "--secondary": primaryLight,
    "--secondary-foreground": primaryDark,
    "--accent": primaryExtraLight,
    "--accent-foreground": primaryDark,
    "--ring": primary,
    "--sidebar": primaryDark,
    "--sidebar-foreground": onSidebar,
    "--sidebar-muted": mutedOnSidebar,
    "--sidebar-accent": primary,
    "--sidebar-accent-foreground": onPrimary,
    "--sidebar-border": mixHex(primaryDark, "#000000", 0.12),
    "--sidebar-primary": primaryLight,
  };
}

/** @deprecated Prefer buildThemeTokensFromColors / deriveThemeFromPrimary. */
export function buildThemeTokensFromHex(
  hex: string
): Record<string, string> | null {
  const palette = deriveThemeFromPrimary(hex);
  if (!palette) return null;
  return buildThemeTokensFromColors(palette);
}

export const CUSTOM_THEME_CSS_VARS = [
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--accent",
  "--accent-foreground",
  "--ring",
  "--sidebar",
  "--sidebar-foreground",
  "--sidebar-muted",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
  "--sidebar-border",
  "--sidebar-primary",
] as const;

export const THEME_COLOR_FIELDS = [
  { key: "primary", label: "Primary" },
  { key: "primaryDark", label: "Primary dark" },
  { key: "primaryLight", label: "Primary light" },
  { key: "primaryExtraLight", label: "Primary extra light" },
] as const satisfies ReadonlyArray<{
  key: keyof ThemeColors;
  label: string;
}>;
