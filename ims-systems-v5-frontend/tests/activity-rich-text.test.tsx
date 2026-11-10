import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActivityRichTextEditor } from "../src/modules/activities/components/activity-rich-text";

vi.mock("@/modules/files/api/files", () => ({
  createViewUrl: vi.fn(),
  uploadFileViaHandler: vi.fn(),
  downloadFile: vi.fn(),
}));

describe("ActivityRichTextEditor", () => {
  it("mounts a lightweight contentEditable composer without TipTap", () => {
    render(
      <ActivityRichTextEditor value="hello" onChange={() => undefined} />
    );
    const editor = screen.getByLabelText("Comment");
    expect(editor).toHaveAttribute("contenteditable", "true");
    expect(document.querySelector(".ProseMirror")).toBeNull();
    expect(screen.getByLabelText("Bold")).toBeInTheDocument();
    expect(screen.getByLabelText("Attach image")).toBeInTheDocument();
  });
});
