import type { CSSProperties } from "react";
import type { FormTheme, FormThemeImage } from "../types";

export const DEFAULT_FORM_THEME: FormTheme = {
  foregroundColor: "#111827",
  backgroundColor: "#F9FAFB",
  accentColor: "#0F766E",
  logo: null,
  coverImage: null,
};

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
  };
}

export function formThemeCssVars(theme: FormTheme): CSSProperties {
  return {
    ["--form-fg" as string]: theme.foregroundColor,
    ["--form-bg" as string]: theme.backgroundColor,
    ["--form-accent" as string]: theme.accentColor,
    color: "var(--form-fg)",
    backgroundColor: "var(--form-bg)",
  };
}

export function themeImageSrc(
  image: FormThemeImage | null | undefined
): string | null {
  if (!image?.src) return null;
  return image.src;
}
