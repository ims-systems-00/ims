import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ActivityRichTextEditor } from "../src/modules/activities/components/activity-rich-text";

describe("ActivityRichTextEditor", () => {
  it("mounts without throwing duplicate-extension errors", async () => {
    render(
      <ActivityRichTextEditor value="" onChange={() => undefined} />
    );
    await waitFor(() => {
      expect(
        screen.queryByText("Loading editor…")
      ).not.toBeInTheDocument();
    });
    expect(document.querySelector(".ProseMirror")).toBeTruthy();
  });
});
