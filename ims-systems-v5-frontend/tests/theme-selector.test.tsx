import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CUSTOM_THEME_CSS_VARS,
  THEME_CUSTOM_HEX_KEY,
  THEME_STORAGE_KEY,
  ThemeProvider,
} from "@/shared/theme";
import { ThemeSelector } from "@/shared/layout/theme-selector";

afterEach(() => {
  cleanup();
  localStorage.removeItem(THEME_STORAGE_KEY);
  localStorage.removeItem(THEME_CUSTOM_HEX_KEY);
  document.documentElement.removeAttribute("data-theme");
  for (const variable of CUSTOM_THEME_CSS_VARS) {
    document.documentElement.style.removeProperty(variable);
  }
});

function renderSelector() {
  return render(
    <ThemeProvider>
      <ThemeSelector />
    </ThemeProvider>
  );
}

describe("ThemeSelector dialog", () => {
  it("opens a dialog with presets and custom color controls", async () => {
    const user = userEvent.setup();
    renderSelector();

    await user.click(
      screen.getByRole("button", { name: /choose color theme/i })
    );

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: /color theme/i })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("listbox", { name: /theme presets/i })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("option", { name: /slate/i })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByLabelText(/brand color hex code/i)
    ).toBeInTheDocument();
    expect(
      within(dialog).getByLabelText(/pick brand color/i)
    ).toBeInTheDocument();
  });

  it("applies a preset from the dialog", async () => {
    const user = userEvent.setup();
    renderSelector();

    await user.click(
      screen.getByRole("button", { name: /choose color theme/i })
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("option", { name: /green/i }));

    expect(document.documentElement.dataset.theme).toBe("green");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("green");
  });

  it("applies a custom hex color", async () => {
    const user = userEvent.setup();
    renderSelector();

    await user.click(
      screen.getByRole("button", { name: /choose color theme/i })
    );
    const dialog = await screen.findByRole("dialog");
    const hexInput = within(dialog).getByLabelText(/brand color hex code/i);

    await user.clear(hexInput);
    await user.type(hexInput, "#be123c");
    await user.click(within(dialog).getByRole("button", { name: /^apply$/i }));

    expect(document.documentElement.dataset.theme).toBe("custom");
    expect(
      document.documentElement.style.getPropertyValue("--primary").trim()
    ).toBe("#BE123C");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("custom");
    expect(localStorage.getItem(THEME_CUSTOM_HEX_KEY)).toBe("#BE123C");
  });
});
