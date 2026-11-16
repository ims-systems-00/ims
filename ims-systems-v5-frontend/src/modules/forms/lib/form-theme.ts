import type { CSSProperties } from "react";
import { useFileViewUrlQuery } from "@/modules/files/hooks/use-files";
import type {
  FormLogoHorizontal,
  FormLogoVertical,
  FormTheme,
  FormThemeImage,
} from "../types";

export const DEFAULT_FORM_THEME: FormTheme = {
  foregroundColor: "#111827",
  backgroundColor: "#F9FAFB",
  accentColor: "#0F766E",
  logo: null,
  coverImage: null,
  logoVertical: "top",
  logoHorizontal: "left",
};

function normalizeLogoVertical(
  value: FormTheme["logoVertical"] | undefined
): FormLogoVertical {
  return value === "bottom" ? "bottom" : "top";
}

function normalizeLogoHorizontal(
  value: FormTheme["logoHorizontal"] | undefined
): FormLogoHorizontal {
  if (value === "center" || value === "right") return value;
  return "left";
}

export function normalizeFormTheme(
  theme?: Partial<FormTheme> | null
): FormTheme {
  return {
    foregroundColor:
      theme?.foregroundColor ?? DEFAULT_FORM_THEME.foregroundColor,
    backgroundColor:
      theme?.backgroundColor ?? DEFAULT_FORM_THEME.backgroundColor,
    accentColor: theme?.accentColor ?? DEFAULT_FORM_THEME.accentColor,
    logo: theme?.logo ?? null,
    coverImage: theme?.coverImage ?? null,
    logoVertical: normalizeLogoVertical(theme?.logoVertical),
    logoHorizontal: normalizeLogoHorizontal(theme?.logoHorizontal),
  };
}

/** Rough luminance check for hex colours (form theme pickers use hex). */
function isDarkHex(hex: string): boolean {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) return false;
  const r = Number.parseInt(match[1]!, 16);
  const g = Number.parseInt(match[2]!, 16);
  const b = Number.parseInt(match[3]!, 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55;
}

/**
 * CSS vars for a self-contained form surface.
 * Remaps app semantic tokens (`--foreground`, `--muted-foreground`, …) so
 * Tailwind utilities inside the form stay readable regardless of app dark mode.
 */
export function formThemeCssVars(theme: FormTheme): CSSProperties {
  const fg = theme.foregroundColor;
  const bg = theme.backgroundColor;
  const accent = theme.accentColor;
  const darkSurface = isDarkHex(bg);

  return {
    ["--form-fg" as string]: fg,
    ["--form-bg" as string]: bg,
    ["--form-accent" as string]: accent,
    ["--form-muted" as string]: `color-mix(in srgb, ${fg} 6%, ${bg})`,
    ["--form-muted-fg" as string]: `color-mix(in srgb, ${fg} 58%, ${bg})`,
    ["--form-border" as string]: `color-mix(in srgb, ${fg} 14%, ${bg})`,
    color: "var(--form-fg)",
    backgroundColor: "var(--form-bg)",
    colorScheme: darkSurface ? "dark" : "light",
    // Isolate from `.dark` app tokens so designers / inputs stay legible.
    ["--foreground" as string]: fg,
    ["--background" as string]: bg,
    ["--card" as string]: bg,
    ["--card-foreground" as string]: fg,
    ["--popover" as string]: darkSurface
      ? `color-mix(in srgb, ${bg} 88%, white)`
      : "#ffffff",
    ["--popover-foreground" as string]: fg,
    ["--muted" as string]: `color-mix(in srgb, ${fg} 6%, ${bg})`,
    ["--muted-foreground" as string]: `color-mix(in srgb, ${fg} 58%, ${bg})`,
    ["--border" as string]: `color-mix(in srgb, ${fg} 14%, ${bg})`,
    ["--border-subtle" as string]: `color-mix(in srgb, ${fg} 8%, ${bg})`,
    ["--input" as string]: `color-mix(in srgb, ${fg} 18%, ${bg})`,
    ["--ring" as string]: accent,
    ["--primary" as string]: accent,
    ["--primary-foreground" as string]: darkSurface ? fg : "#ffffff",
    ["--accent" as string]: `color-mix(in srgb, ${accent} 14%, ${bg})`,
    ["--accent-foreground" as string]: fg,
    ["--surface" as string]: bg,
    ["--surface-elevated" as string]: darkSurface
      ? `color-mix(in srgb, ${bg} 90%, white)`
      : "#ffffff",
    ["--surface-muted" as string]: `color-mix(in srgb, ${fg} 4%, ${bg})`,
  };
}

/** Sync fallback — prefer {@link useThemeImageSrc} so signed URLs stay fresh. */
export function themeImageSrc(
  image: FormThemeImage | null | undefined
): string | null {
  if (!image?.src) return null;
  return image.src;
}

/**
 * Display URL for a form theme image (logo / cover): mint a fresh File Handler
 * view URL from bucket/key when available. Persisted `src` signed URLs expire
 * and otherwise 403 after FILES_VIEW_URL_TTL_SECONDS.
 */
export function useThemeImageSrc(
  image: FormThemeImage | null | undefined
): string | null {
  const storage = image?.storage ?? null;
  const view = useFileViewUrlQuery(
    storage
      ? {
          Bucket: storage.bucket,
          Key: storage.key,
          key: storage.key,
          Name: storage.fileName ?? "image",
        }
      : null,
    Boolean(storage?.bucket && storage?.key)
  );
  if (view.data?.url) return view.data.url;
  if (storage?.bucket && storage?.key) {
    // Avoid flashing an expired signed `src` while a fresh URL loads.
    return view.isError ? (image?.src ?? null) : null;
  }
  return image?.src ?? null;
}
