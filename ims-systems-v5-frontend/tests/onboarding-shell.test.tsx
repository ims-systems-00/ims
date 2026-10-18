import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { OnboardingShell } from "@/shared/layout";

vi.mock("@/shared/layout/user-menu", () => ({
  UserMenu: () => <button type="button">Account</button>,
}));

vi.mock("@/shared/layout/theme-selector", () => ({
  ThemeSelector: () => <button type="button">Theme</button>,
}));

afterEach(() => {
  cleanup();
});

describe("OnboardingShell", () => {
  it("renders onboard content without the product sidebar", () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/onboard/organisation"]}>
          <Routes>
            <Route path="onboard" element={<OnboardingShell />}>
              <Route
                path="organisation"
                element={<p>Create organisation content</p>}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(
      screen.getByText("Create organisation content")
    ).toBeInTheDocument();
    expect(screen.getByText(/organisation setup/i)).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /primary/i })).toBeNull();
    expect(screen.queryByText(/live dashboard/i)).toBeNull();
  });
});
