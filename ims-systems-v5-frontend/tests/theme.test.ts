import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CUSTOM_HEX,
  DEFAULT_THEME_ID,
  THEME_CUSTOM_HEX_KEY,
  THEME_STORAGE_KEY,
  applyCustomTheme,
  applyPresetTheme,
  applyTheme,
  buildThemeTokensFromHex,
  CUSTOM_THEME_CSS_VARS,
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
  document.documentElement.removeAttribute("data-theme");
  for (const variable of CUSTOM_THEME_CSS_VARS) {
    document.documentElement.style.removeProperty(variable);
  }
});

describe("theme presets", () => {
  it("exposes a curated set of professional themes", () => {
    expect(themeOptions.map((t) => t.id)).toEqual([
      "slate",
      "blue",
      "violet",
      "green",
      "orange",
      "rose",
    ]);
    expect(DEFAULT_THEME_ID).toBe("slate");
  });

  it("validates theme ids and falls back safely", () => {
    expect(isThemeId("blue")).toBe(true);
    expect(isThemeId("custom")).toBe(false);
    expect(isAppliedThemeId("custom")).toBe(true);
    expect(isThemeId("neon")).toBe(false);
    expect(resolveThemeId("violet")).toBe("violet");
    expect(resolveThemeId("not-a-theme")).toBe("slate");
    expect(resolveThemeId(null)).toBe("slate");
  });

  it("persists and restores the selected theme", () => {
    persistThemeId("green");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("green");
    expect(readStoredThemeId()).toBe("green");
  });

  it("ignores invalid stored themes", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "hotpink");
    expect(readStoredThemeId()).toBe("slate");
  });

  it("applies the theme via data-theme on the document element", () => {
    applyPresetTheme("orange");
    expect(document.documentElement.dataset.theme).toBe("orange");
  });
});

describe("custom brand color", () => {
  it("normalizes and validates hex colors", () => {
    expect(normalizeHexColor("2563eb")).toBe("#2563EB");
    expect(normalizeHexColor("#abc")).toBeNull();
    expect(isValidHexColor("#00AA11")).toBe(true);
    expect(isValidHexColor("red")).toBe(false);
  });

  it("builds identity tokens from a hex brand color", () => {
    const tokens = buildThemeTokensFromHex("#2563EB");
    expect(tokens).not.toBeNull();
    expect(tokens!["--primary"]).toBe("#2563EB");
    expect(tokens!["--sidebar"]).toMatch(/^hsl\(/);
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

  it("clears custom vars when switching back to a preset", () => {
    applyCustomTheme("#15803D");
    applyPresetTheme("slate");
    expect(document.documentElement.dataset.theme).toBe("slate");
    expect(
      document.documentElement.style.getPropertyValue("--primary")
    ).toBe("");
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
