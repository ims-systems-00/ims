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

export function formThemeCssVars(theme: FormTheme): CSSProperties {
  return {
    ["--form-fg" as string]: theme.foregroundColor,
    ["--form-bg" as string]: theme.backgroundColor,
    ["--form-accent" as string]: theme.accentColor,
    color: "var(--form-fg)",
    backgroundColor: "var(--form-bg)",
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
