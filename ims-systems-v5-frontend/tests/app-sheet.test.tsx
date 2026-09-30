import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppSheet } from "@/shared/components/app-sheet";
import { Button } from "@/shared/components/ui/button";

describe("AppSheet", () => {
  it("renders title and content when open", () => {
    render(
      <AppSheet
        open
        onOpenChange={() => undefined}
        title="Create item"
        description="Sheet description"
        footer={<Button type="button">Save</Button>}
      >
        <p>Sheet body content</p>
      </AppSheet>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Create item")).toBeInTheDocument();
    expect(screen.getByText("Sheet body content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("invokes onOpenChange when close is pressed", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <AppSheet open onOpenChange={onOpenChange} title="Panel">
        <p>Body</p>
      </AppSheet>
    );

    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
