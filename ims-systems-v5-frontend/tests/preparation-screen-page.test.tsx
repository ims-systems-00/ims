import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PreparationScreenPage } from "@/modules/auth";

afterEach(() => {
  cleanup();
});

describe("PreparationScreenPage", () => {
  it("lands on the dashboard root after finishing setup", async () => {
    render(
      <MemoryRouter initialEntries={["/auth/preparation-screen"]}>
        <Routes>
          <Route
            path="/auth/preparation-screen"
            element={<PreparationScreenPage />}
          />
          <Route path="/" element={<p>Live Dashboard</p>} />
          <Route path="/organisation" element={<p>My organisation</p>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Finishing setup…")).toBeInTheDocument();
    expect(
      await screen.findByText("Live Dashboard", undefined, { timeout: 3000 })
    ).toBeInTheDocument();
    expect(screen.queryByText("My organisation")).not.toBeInTheDocument();
  });
});
