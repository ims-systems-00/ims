import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyAppearanceMode,
  persistAppearanceMode,
  readStoredAppearanceMode,
  type AppearanceMode,
} from "./appearance";
import {
  applyCustomThemeColors,
  applyPresetTheme,
  DEFAULT_THEME_COLORS,
  persistCustomColors,
  persistThemeId,
  readStoredCustomColors,
  readStoredThemeId,
  resolvePresetColors,
  type AppliedThemeId,
  type ThemeColors,
  type ThemeId,
  themeOptions,
} from "./presets";
import {
  deriveDarkThemeFromColors,
  deriveThemeFromPrimary,
  normalizeHexColor,
} from "./color-utils";

type ThemeContextValue = {
  themeId: AppliedThemeId;
  /** Live applied palette for the current appearance. */
  colors: ThemeColors;
  /**
   * Editable brand palette (light preset / custom). Dark appearance remaps
   * are not edited here.
   */
  brandColors: ThemeColors;
  /** Convenience: primary hex (custom drafts / legacy). */
  customHex: string;
  isCustom: boolean;
  appearance: AppearanceMode;
  isDark: boolean;
  setThemeId: (themeId: ThemeId) => void;
  setCustomColors: (colors: Partial<ThemeColors>) => boolean;
  /** Derive remaining shades from primary and apply (V4 “Generate from primary”). */
  setCustomHex: (hex: string) => boolean;
  setAppearance: (mode: AppearanceMode) => void;
  toggleAppearance: () => void;
  themes: typeof themeOptions;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
};

function brandColorsForTheme(
  themeId: AppliedThemeId,
  custom: ThemeColors
): ThemeColors {
  if (themeId === "custom") return custom;
  const preset = themeOptions.find((theme) => theme.id === themeId);
  return preset?.colors ?? DEFAULT_THEME_COLORS;
}

function colorsForTheme(
  themeId: AppliedThemeId,
  custom: ThemeColors,
  appearance: AppearanceMode
): ThemeColors {
  if (themeId === "custom") {
    return appearance === "dark"
      ? deriveDarkThemeFromColors(custom)
      : custom;
  }
  return resolvePresetColors(themeId, appearance);
}

function applyThemeForAppearance(
  themeId: AppliedThemeId,
  custom: ThemeColors,
  appearance: AppearanceMode
): void {
  if (themeId === "custom") {
    applyCustomThemeColors(custom, document.documentElement, appearance);
    return;
  }
  applyPresetTheme(themeId, document.documentElement, appearance);
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [appearance, setAppearanceState] = useState<AppearanceMode>(() => {
    const initial = readStoredAppearanceMode();
    if (typeof document !== "undefined") {
      applyAppearanceMode(initial);
    }
    return initial;
  });

  const [themeId, setThemeIdState] = useState<AppliedThemeId>(() => {
    const initial = readStoredThemeId();
    const custom = readStoredCustomColors();
    const mode = readStoredAppearanceMode();
    if (typeof document !== "undefined") {
      applyThemeForAppearance(initial, custom, mode);
    }
    return initial;
  });

  const [customColors, setCustomColorsState] = useState<ThemeColors>(() =>
    readStoredCustomColors()
  );

  const setThemeId = useCallback(
    (next: ThemeId) => {
      setThemeIdState(next);
      applyPresetTheme(next, document.documentElement, appearance);
      persistThemeId(next);
    },
    [appearance]
  );

  const setCustomColors = useCallback(
    (next: Partial<ThemeColors>) => {
      const applied = applyCustomThemeColors(
        next,
        document.documentElement,
        appearance
      );
      if (!applied) return false;
      setCustomColorsState(applied);
      setThemeIdState("custom");
      persistThemeId("custom");
      persistCustomColors(applied);
      return true;
    },
    [appearance]
  );

  const setCustomHex = useCallback(
    (hex: string) => {
      const normalized = normalizeHexColor(hex);
      if (!normalized) return false;
      const palette = deriveThemeFromPrimary(normalized);
      if (!palette) return false;
      return setCustomColors(palette);
    },
    [setCustomColors]
  );

  const setAppearance = useCallback(
    (mode: AppearanceMode) => {
      setAppearanceState(mode);
      applyAppearanceMode(mode);
      persistAppearanceMode(mode);
      applyThemeForAppearance(themeId, customColors, mode);
    },
    [themeId, customColors]
  );

  const toggleAppearance = useCallback(() => {
    setAppearanceState((current) => {
      const next: AppearanceMode = current === "dark" ? "light" : "dark";
      applyAppearanceMode(next);
      persistAppearanceMode(next);
      applyThemeForAppearance(themeId, customColors, next);
      return next;
    });
  }, [themeId, customColors]);

  const brandColors = useMemo(
    () => brandColorsForTheme(themeId, customColors),
    [themeId, customColors]
  );

  const colors = useMemo(
    () => colorsForTheme(themeId, customColors, appearance),
    [themeId, customColors, appearance]
  );

  const value = useMemo(
    () => ({
      themeId,
      colors,
      brandColors,
      customHex: customColors.primary,
      isCustom: themeId === "custom",
      appearance,
      isDark: appearance === "dark",
      setThemeId,
      setCustomColors,
      setCustomHex,
      setAppearance,
      toggleAppearance,
      themes: themeOptions,
    }),
    [
      themeId,
      colors,
      brandColors,
      customColors.primary,
      appearance,
      setThemeId,
      setCustomColors,
      setCustomHex,
      setAppearance,
      toggleAppearance,
    ]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
