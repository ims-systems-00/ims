import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyCustomThemeColors,
  applyPresetTheme,
  DEFAULT_THEME_COLORS,
  persistCustomColors,
  persistThemeId,
  readStoredCustomColors,
  readStoredThemeId,
  type AppliedThemeId,
  type ThemeColors,
  type ThemeId,
  themeOptions,
} from "./presets";
import { deriveThemeFromPrimary, normalizeHexColor } from "./color-utils";

type ThemeContextValue = {
  themeId: AppliedThemeId;
  /** Active 4-shade palette (preset or custom). */
  colors: ThemeColors;
  /** Convenience: primary hex (custom drafts / legacy). */
  customHex: string;
  isCustom: boolean;
  setThemeId: (themeId: ThemeId) => void;
  setCustomColors: (colors: Partial<ThemeColors>) => boolean;
  /** Derive remaining shades from primary and apply (V4 “Generate from primary”). */
  setCustomHex: (hex: string) => boolean;
  themes: typeof themeOptions;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
};

function colorsForTheme(
  themeId: AppliedThemeId,
  custom: ThemeColors
): ThemeColors {
  if (themeId === "custom") return custom;
  const preset = themeOptions.find((theme) => theme.id === themeId);
  return preset?.colors ?? DEFAULT_THEME_COLORS;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeId, setThemeIdState] = useState<AppliedThemeId>(() => {
    const initial = readStoredThemeId();
    const custom = readStoredCustomColors();
    if (typeof document !== "undefined") {
      if (initial === "custom") {
        applyCustomThemeColors(custom);
      } else {
        applyPresetTheme(initial);
      }
    }
    return initial;
  });

  const [customColors, setCustomColorsState] = useState<ThemeColors>(() =>
    readStoredCustomColors()
  );

  const setThemeId = useCallback((next: ThemeId) => {
    setThemeIdState(next);
    applyPresetTheme(next);
    persistThemeId(next);
  }, []);

  const setCustomColors = useCallback((next: Partial<ThemeColors>) => {
    const applied = applyCustomThemeColors(next);
    if (!applied) return false;
    setCustomColorsState(applied);
    setThemeIdState("custom");
    persistThemeId("custom");
    persistCustomColors(applied);
    return true;
  }, []);

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

  const colors = useMemo(
    () => colorsForTheme(themeId, customColors),
    [themeId, customColors]
  );

  const value = useMemo(
    () => ({
      themeId,
      colors,
      customHex: customColors.primary,
      isCustom: themeId === "custom",
      setThemeId,
      setCustomColors,
      setCustomHex,
      themes: themeOptions,
    }),
    [
      themeId,
      colors,
      customColors.primary,
      setThemeId,
      setCustomColors,
      setCustomHex,
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
