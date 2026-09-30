import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyCustomTheme,
  applyPresetTheme,
  persistCustomHex,
  persistThemeId,
  readStoredCustomHex,
  readStoredThemeId,
  type AppliedThemeId,
  type ThemeId,
  themeOptions,
} from "./presets";
import { normalizeHexColor } from "./color-utils";

type ThemeContextValue = {
  themeId: AppliedThemeId;
  customHex: string;
  isCustom: boolean;
  setThemeId: (themeId: ThemeId) => void;
  setCustomHex: (hex: string) => boolean;
  themes: typeof themeOptions;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeId, setThemeIdState] = useState<AppliedThemeId>(() => {
    const initial = readStoredThemeId();
    const hex = readStoredCustomHex();
    if (typeof document !== "undefined") {
      if (initial === "custom") {
        applyCustomTheme(hex);
      } else {
        applyPresetTheme(initial);
      }
    }
    return initial;
  });

  const [customHex, setCustomHexState] = useState<string>(() =>
    readStoredCustomHex()
  );

  const setThemeId = useCallback((next: ThemeId) => {
    setThemeIdState(next);
    applyPresetTheme(next);
    persistThemeId(next);
  }, []);

  const setCustomHex = useCallback((hex: string) => {
    const normalized = normalizeHexColor(hex);
    if (!normalized) return false;
    setCustomHexState(normalized);
    setThemeIdState("custom");
    const applied = applyCustomTheme(normalized);
    if (applied) {
      persistThemeId("custom");
      persistCustomHex(normalized);
    }
    return applied;
  }, []);

  const value = useMemo(
    () => ({
      themeId,
      customHex,
      isCustom: themeId === "custom",
      setThemeId,
      setCustomHex,
      themes: themeOptions,
    }),
    [themeId, customHex, setThemeId, setCustomHex]
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
