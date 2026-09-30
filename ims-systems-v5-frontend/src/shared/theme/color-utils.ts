/**
 * Hex / HSL helpers for custom brand theme generation.
 */

export const HEX_COLOR_PATTERN = /^#([0-9A-Fa-f]{6})$/;

export type HslColor = {
  h: number;
  s: number;
  l: number;
};

/** Normalize user input to `#RRGGBB` or null when invalid. */
export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
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

function hsl(h: number, s: number, l: number): string {
  return `hsl(${round(h)} ${round(s)}% ${round(l)}%)`;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Derive the identity token set used by themes.css from a brand hex.
 * Surfaces (background/foreground/border) stay on the default palette.
 */
export function buildThemeTokensFromHex(
  hex: string
): Record<string, string> | null {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;

  const { h, s } = hexToHsl(normalized);
  const sat = clamp(s, 22, 68);
  const primaryL = clamp(hexToHsl(normalized).l, 28, 52);
  const lightFg = hexLuminance(normalized) > 0.55;

  return {
    "--primary": normalized,
    "--primary-foreground": lightFg ? "#111827" : "#FAFAFA",
    "--secondary": hsl(h, Math.min(sat, 28), 95.5),
    "--secondary-foreground": hsl(h, Math.min(sat + 5, 55), 28),
    "--accent": hsl(h, Math.min(sat, 32), 94.5),
    "--accent-foreground": hsl(h, Math.min(sat + 5, 55), 26),
    "--ring": hsl(h, sat, clamp(primaryL + 6, 35, 58)),
    "--sidebar": hsl(h, Math.min(sat, 38), 16),
    "--sidebar-foreground": hsl(h, 12, 92),
    "--sidebar-muted": hsl(h, 12, 68),
    "--sidebar-accent": hsl(h, Math.min(sat, 34), 22),
    "--sidebar-accent-foreground": hsl(h, 10, 98),
    "--sidebar-border": hsl(h, Math.min(sat, 30), 24),
    "--sidebar-primary": hsl(h, Math.min(sat + 8, 55), 78),
  };
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
