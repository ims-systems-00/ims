import { afterEach, describe, expect, it } from "vitest";
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_CUSTOM_HEX,
  DEFAULT_THEME_COLORS,
  DEFAULT_THEME_ID,
  IMS_OS_DARK_THEME_COLORS,
  THEME_CUSTOM_COLORS_KEY,
  THEME_CUSTOM_HEX_KEY,
  THEME_STORAGE_KEY,
  applyAppearanceMode,
  applyCustomTheme,
  applyCustomThemeColors,
  applyPresetTheme,
  applyTheme,
  buildThemeTokensFromColors,
  buildThemeTokensFromHex,
  CUSTOM_THEME_CSS_VARS,
  deriveThemeFromPrimary,
  isAppliedThemeId,
  isThemeId,
  isValidHexColor,
  normalizeHexColor,
  persistAppearanceMode,
  persistCustomHex,
  persistThemeId,
  readStoredAppearanceMode,
  readStoredCustomHex,
  readStoredThemeId,
  resolveThemeId,
  themeOptions,
} from "@/shared/theme";

afterEach(() => {
  localStorage.removeItem(THEME_STORAGE_KEY);
  localStorage.removeItem(THEME_CUSTOM_HEX_KEY);
  localStorage.removeItem(THEME_CUSTOM_COLORS_KEY);
  localStorage.removeItem(APPEARANCE_STORAGE_KEY);
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-appearance");
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "";
  for (const variable of CUSTOM_THEME_CSS_VARS) {
    document.documentElement.style.removeProperty(variable);
  }
});

describe("theme presets", () => {
  it("exposes organisation theme templates with iMS OS as default", () => {
    expect(themeOptions.map((t) => t.id)).toEqual([
      "ims-os",
      "ocean-teal",
      "forest",
      "ember",
      "slate",
      "coral",
      "amber",
      "violet",
    ]);
    expect(DEFAULT_THEME_ID).toBe("ims-os");
    expect(themeOptions[0]?.colors).toEqual(DEFAULT_THEME_COLORS);
    expect(DEFAULT_THEME_COLORS.primary).toBe("#0040A3");
    expect(DEFAULT_THEME_COLORS.primaryDark).toBe("#002D72");
  });

  it("validates theme ids and falls back safely", () => {
    expect(isThemeId("forest")).toBe(true);
    expect(isThemeId("custom")).toBe(false);
    expect(isAppliedThemeId("custom")).toBe(true);
    expect(isThemeId("neon")).toBe(false);
    expect(resolveThemeId("violet")).toBe("violet");
    expect(resolveThemeId("green")).toBe("forest");
    expect(resolveThemeId("default-blue")).toBe("ims-os");
    expect(resolveThemeId("not-a-theme")).toBe("ims-os");
    expect(resolveThemeId(null)).toBe("ims-os");
  });

  it("persists and restores the selected theme", () => {
    persistThemeId("forest");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("forest");
    expect(readStoredThemeId()).toBe("forest");
  });

  it("ignores invalid stored themes", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "hotpink");
    expect(readStoredThemeId()).toBe("ims-os");
  });

  it("applies V4 shades to primary and sidebar tokens", () => {
    applyPresetTheme("amber");
    expect(document.documentElement.dataset.theme).toBe("amber");
    expect(
      document.documentElement.style.getPropertyValue("--primary").trim()
    ).toBe("#D97706");
    expect(
      document.documentElement.style.getPropertyValue("--sidebar").trim()
    ).toBe("#1A1205");
  });

  it("maps each preset primary/dark onto button and sidebar tokens", () => {
    for (const theme of themeOptions) {
      const tokens = buildThemeTokensFromColors(theme.colors, "light");
      expect(tokens["--primary"]).toBe(theme.colors.primary);
      expect(tokens["--sidebar"]).toBe(theme.colors.primaryDark);
      expect(tokens["--sidebar-accent"]).toBe(theme.colors.primary);
    }
  });

  it("gives every preset a distinct dark palette different from light", () => {
    for (const theme of themeOptions) {
      expect(theme.darkColors).toBeDefined();
      expect(theme.darkColors.primary).not.toBe(theme.colors.primary);
      expect(theme.darkColors.primaryDark).not.toBe(theme.colors.primaryDark);
      const darkTokens = buildThemeTokensFromColors(theme.darkColors, "dark");
      expect(darkTokens["--background"]).toBe(theme.darkColors.primaryDark);
      expect(darkTokens["--foreground"]).toBeTruthy();
      expect(darkTokens["--primary"]).toBe(theme.darkColors.primary);
    }
  });
});

describe("custom brand color", () => {
  it("normalizes and validates hex colors", () => {
    expect(normalizeHexColor("2563eb")).toBe("#2563EB");
    expect(normalizeHexColor("#abc")).toBeNull();
    expect(isValidHexColor("#00AA11")).toBe(true);
    expect(isValidHexColor("red")).toBe(false);
  });

  it("derives the V4 four-shade palette from a primary hex", () => {
    const palette = deriveThemeFromPrimary("#2563EB");
    expect(palette).not.toBeNull();
    expect(palette!.primary).toBe("#2563EB");
    expect(palette!.primaryDark).toMatch(/^#[0-9A-F]{6}$/);
    expect(palette!.primaryLight).toMatch(/^#[0-9A-F]{6}$/);
    expect(palette!.primaryExtraLight).toMatch(/^#[0-9A-F]{6}$/);

    const tokens = buildThemeTokensFromHex("#2563EB");
    expect(tokens).not.toBeNull();
    expect(tokens!["--primary"]).toBe("#2563EB");
    expect(tokens!["--sidebar"]).toBe(palette!.primaryDark);
  });

  it("applies and persists a custom theme", () => {
    expect(applyCustomTheme("#BE123C")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("custom");
    expect(
      document.documentElement.style.getPropertyValue("--primary").trim()
    ).toBe("#BE123C");

    persistThemeId("custom");
    persistCustomHex("#BE123C");
    expect(readStoredThemeId()).toBe("custom");
    expect(readStoredCustomHex()).toBe("#BE123C");
  });

  it("applies an explicit custom 4-shade palette", () => {
    const applied = applyCustomThemeColors({
      primary: "#0D9488",
      primaryDark: "#0F766E",
      primaryLight: "#99F6E4",
      primaryExtraLight: "#F0FDFA",
    });
    expect(applied).not.toBeNull();
    expect(
      document.documentElement.style.getPropertyValue("--primary").trim()
    ).toBe("#0D9488");
    expect(
      document.documentElement.style.getPropertyValue("--sidebar").trim()
    ).toBe("#0F766E");
  });

  it("switches brand tokens when moving from custom to a preset", () => {
    applyCustomTheme("#15803D");
    applyPresetTheme("slate");
    expect(document.documentElement.dataset.theme).toBe("slate");
    expect(
      document.documentElement.style.getPropertyValue("--primary").trim()
    ).toBe("#475569");
    expect(
      document.documentElement.style.getPropertyValue("--sidebar").trim()
    ).toBe("#0F172A");
  });

  it("falls back to the default custom hex when storage is empty", () => {
    expect(readStoredCustomHex()).toBe(DEFAULT_CUSTOM_HEX);
  });

  it("applyTheme supports custom with an explicit hex", () => {
    applyTheme("custom", document.documentElement, "#7C3AED");
    expect(document.documentElement.dataset.theme).toBe("custom");
    expect(
      document.documentElement.style.getPropertyValue("--primary").trim()
    ).toBe("#7C3AED");
  });
});

describe("appearance mode", () => {
  it("applies and persists dark mode on the document root", () => {
    applyAppearanceMode("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.appearance).toBe("dark");
    persistAppearanceMode("dark");
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe("dark");
    expect(readStoredAppearanceMode()).toBe("dark");
  });

  it("clears the dark class in light mode", () => {
    applyAppearanceMode("dark");
    applyAppearanceMode("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.dataset.appearance).toBe("light");
  });

  it("uses classic primary dark in light and iMS OS indigo in dark for ims-os", () => {
    applyPresetTheme("ims-os", document.documentElement, "light");
    expect(
      document.documentElement.style.getPropertyValue("--sidebar").trim()
    ).toBe("#002D72");
    applyPresetTheme("ims-os", document.documentElement, "dark");
    expect(
      document.documentElement.style.getPropertyValue("--primary").trim()
    ).toBe(IMS_OS_DARK_THEME_COLORS.primary);
    expect(
      document.documentElement.style.getPropertyValue("--sidebar").trim()
    ).toBe(IMS_OS_DARK_THEME_COLORS.primaryDark);
    expect(
      document.documentElement.style.getPropertyValue("--background").trim()
    ).toBe(IMS_OS_DARK_THEME_COLORS.primaryDark);
    // Light brand palette stays classic even while dark tokens are applied.
    expect(DEFAULT_THEME_COLORS.primaryDark).toBe("#002D72");
    expect(themeOptions[0]?.colors.primaryDark).toBe("#002D72");
  });

  it("switches forest dark surfaces away from the global indigo shell", () => {
    applyPresetTheme("forest", document.documentElement, "dark");
    expect(
      document.documentElement.style.getPropertyValue("--primary").trim()
    ).toBe("#4ADE80");
    expect(
      document.documentElement.style.getPropertyValue("--background").trim()
    ).toBe("#06140C");
    expect(
      document.documentElement.style.getPropertyValue("--foreground").trim()
    ).toBeTruthy();
  });
});
