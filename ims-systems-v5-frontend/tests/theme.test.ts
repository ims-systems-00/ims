import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CUSTOM_HEX,
  DEFAULT_THEME_COLORS,
  DEFAULT_THEME_ID,
  THEME_CUSTOM_COLORS_KEY,
  THEME_CUSTOM_HEX_KEY,
  THEME_STORAGE_KEY,
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
  persistCustomHex,
  persistThemeId,
  readStoredCustomHex,
  readStoredThemeId,
  resolveThemeId,
  themeOptions,
} from "@/shared/theme";

afterEach(() => {
  localStorage.removeItem(THEME_STORAGE_KEY);
  localStorage.removeItem(THEME_CUSTOM_HEX_KEY);
  localStorage.removeItem(THEME_CUSTOM_COLORS_KEY);
  document.documentElement.removeAttribute("data-theme");
  for (const variable of CUSTOM_THEME_CSS_VARS) {
    document.documentElement.style.removeProperty(variable);
  }
});

describe("theme presets", () => {
  it("exposes the V4 organisation theme templates", () => {
    expect(themeOptions.map((t) => t.id)).toEqual([
      "default-blue",
      "ocean-teal",
      "forest",
      "indigo",
      "slate",
      "coral",
      "amber",
      "violet",
    ]);
    expect(DEFAULT_THEME_ID).toBe("default-blue");
    expect(themeOptions[0]?.colors).toEqual(DEFAULT_THEME_COLORS);
  });

  it("validates theme ids and falls back safely", () => {
    expect(isThemeId("forest")).toBe(true);
    expect(isThemeId("custom")).toBe(false);
    expect(isAppliedThemeId("custom")).toBe(true);
    expect(isThemeId("neon")).toBe(false);
    expect(resolveThemeId("violet")).toBe("violet");
    expect(resolveThemeId("green")).toBe("forest");
    expect(resolveThemeId("not-a-theme")).toBe("default-blue");
    expect(resolveThemeId(null)).toBe("default-blue");
  });

  it("persists and restores the selected theme", () => {
    persistThemeId("forest");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("forest");
    expect(readStoredThemeId()).toBe("forest");
  });

  it("ignores invalid stored themes", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "hotpink");
    expect(readStoredThemeId()).toBe("default-blue");
  });

  it("applies V4 shades to primary and sidebar tokens", () => {
    applyPresetTheme("amber");
    expect(document.documentElement.dataset.theme).toBe("amber");
    expect(
      document.documentElement.style.getPropertyValue("--primary").trim()
    ).toBe("#D97706");
    expect(
      document.documentElement.style.getPropertyValue("--sidebar").trim()
    ).toBe("#B45309");
  });

  it("maps each preset primary/dark onto button and sidebar tokens", () => {
    for (const theme of themeOptions) {
      const tokens = buildThemeTokensFromColors(theme.colors);
      expect(tokens["--primary"]).toBe(theme.colors.primary);
      expect(tokens["--sidebar"]).toBe(theme.colors.primaryDark);
      expect(tokens["--sidebar-accent"]).toBe(theme.colors.primary);
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
    ).toBe("#334155");
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
