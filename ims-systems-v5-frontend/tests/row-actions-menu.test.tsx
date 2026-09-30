import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RowActionsMenu } from "@/shared/components/row-actions-menu";

afterEach(() => {
  cleanup();
});

describe("RowActionsMenu", () => {
  it("opens a menu with Details and Delete actions", async () => {
    const user = userEvent.setup();
    const onDetails = vi.fn();
    const onDelete = vi.fn();

    render(
      <RowActionsMenu
        label="Open row actions"
        actions={[
          { id: "details", label: "Details", onSelect: onDetails },
          {
            id: "delete",
            label: "Delete",
            variant: "destructive",
            onSelect: onDelete,
          },
        ]}
      />
    );

    await user.click(screen.getByRole("button", { name: /open row actions/i }));
    expect(await screen.findByRole("menuitem", { name: /details/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /delete/i })).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: /details/i }));
    expect(onDetails).toHaveBeenCalledTimes(1);
  });
});
