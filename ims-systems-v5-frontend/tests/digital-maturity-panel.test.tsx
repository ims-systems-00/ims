import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DigitalMaturityStats } from "@/modules/dashboard/types";
import { DigitalMaturityPanelContent } from "@/modules/dashboard/components/digital-maturity-panel";

afterEach(() => {
  cleanup();
});

const sample: DigitalMaturityStats = {
  organisationalMaturity: [
    { key: "risk", label: "Risk", score: 3, utilisationPercentage: 0 },
    { key: "incident", label: "Incident", score: 2, utilisationPercentage: 0 },
    { key: "supplier", label: "Supplier", score: 4, utilisationPercentage: 0 },
    { key: "document", label: "Documents", score: 1, utilisationPercentage: 0 },
    { key: "cip", label: "CIP", score: 3, utilisationPercentage: 0 },
    { key: "audit", label: "Audit", score: 2, utilisationPercentage: 0 },
    { key: "inventory", label: "Inventory", score: 3, utilisationPercentage: 0 },
  ],
  businessUnitMaturity: [
    {
      functionalUnitId: "bu1",
      name: "Operations",
      modules: [
        { key: "risk", label: "Risk", score: 4, utilisationPercentage: 100 },
        {
          key: "incident",
          label: "Incident",
          score: 2,
          utilisationPercentage: 0,
        },
        {
          key: "supplier",
          label: "Supplier",
          score: 4,
          utilisationPercentage: 100,
        },
        {
          key: "document",
          label: "Documents",
          score: 1,
          utilisationPercentage: 0,
        },
        { key: "cip", label: "CIP", score: 3, utilisationPercentage: 100 },
        { key: "audit", label: "Audit", score: 2, utilisationPercentage: 0 },
        {
          key: "inventory",
          label: "Inventory",
          score: 3,
          utilisationPercentage: 100,
        },
      ],
    },
    {
      functionalUnitId: "bu2",
      name: "Finance",
      modules: [
        { key: "risk", label: "Risk", score: 2, utilisationPercentage: 0 },
        {
          key: "incident",
          label: "Incident",
          score: 2,
          utilisationPercentage: 0,
        },
        {
          key: "supplier",
          label: "Supplier",
          score: 2,
          utilisationPercentage: 0,
        },
        {
          key: "document",
          label: "Documents",
          score: 1,
          utilisationPercentage: 0,
        },
        { key: "cip", label: "CIP", score: 2, utilisationPercentage: 0 },
        { key: "audit", label: "Audit", score: 2, utilisationPercentage: 0 },
        {
          key: "inventory",
          label: "Inventory",
          score: 2,
          utilisationPercentage: 0,
        },
      ],
    },
  ],
};

describe("DigitalMaturityPanelContent", () => {
  it("shows organisation score and unit selectors", () => {
    render(<DigitalMaturityPanelContent data={sample} />);

    expect(
      screen.getByLabelText(/organisation maturity score 18 of 28/i)
    ).toBeInTheDocument();
    const units = screen.getByLabelText(/^business units$/i);
    expect(
      within(units).getByRole("button", { name: /operations/i })
    ).toBeInTheDocument();
    expect(
      within(units).getByRole("button", { name: /finance/i })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/digital maturity for operations/i)
    ).toBeInTheDocument();
  });

  it("switches module detail when another unit is selected", async () => {
    const user = userEvent.setup();
    render(<DigitalMaturityPanelContent data={sample} />);

    const units = screen.getByLabelText(/^business units$/i);
    await user.click(within(units).getByRole("button", { name: /finance/i }));
    expect(
      screen.getByLabelText(/digital maturity for finance/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/avg level 1\.9/i)).toBeInTheDocument();
  });
});
