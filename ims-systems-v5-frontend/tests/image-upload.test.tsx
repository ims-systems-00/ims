import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/modules/files/api/files", () => ({
  createUploadUrl: vi.fn(),
  createViewUrl: vi.fn(async () => ({
    url: "https://storage.example/me.png?sig=1",
    expiresInSeconds: 43200,
  })),
  deleteStoredFile: vi.fn(async () => ({ Bucket: "b", Key: "k" })),
  downloadFile: vi.fn(async () => undefined),
  uploadFileViaHandler: vi.fn(
    async (
      file: File,
      _path?: string,
      options?: { onProgress?: (n: number) => void }
    ) => {
      options?.onProgress?.(100);
      return {
        Name: file.name,
        Key: "profile/me.png",
        key: "profile/me.png",
        Bucket: "org-bucket",
      };
    }
  ),
}));

vi.mock("@/shared/lib/toast", () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { ImageUploadControl } from "@/modules/files/components/image-upload-control";
import * as filesApi from "@/modules/files/api/files";
import { notify } from "@/shared/lib/toast";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ImageUploadControl", () => {
  it("uploads an image via the File Handler and reports meta + view URL", async () => {
    const onUploaded = vi.fn(async () => undefined);
    const { container } = render(
      <ImageUploadControl
        imageUrl={null}
        alt="Jane profile picture"
        fallbackLabel="JD"
        onUploaded={onUploaded}
      />
    );

    expect(screen.getByText("Upload photo")).toBeTruthy();
    const input = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(["png-bytes"], "me.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
    expect(vi.mocked(filesApi.uploadFileViaHandler)).toHaveBeenCalledWith(
      file,
      "profile",
      expect.objectContaining({ onProgress: expect.any(Function) })
    );
    expect(onUploaded).toHaveBeenCalledWith(
      expect.objectContaining({ Bucket: "org-bucket", Key: "profile/me.png" }),
      "https://storage.example/me.png?sig=1"
    );
    // Optimistic preview of the uploaded image.
    expect(
      screen.getByAltText("Jane profile picture").getAttribute("src")
    ).toBe("https://storage.example/me.png?sig=1");
  });

  it("rejects non-image files without uploading", async () => {
    const onUploaded = vi.fn(async () => undefined);
    const { container } = render(
      <ImageUploadControl
        imageUrl="https://storage.example/current.png"
        alt="Logo"
        uploadLabel="Upload logo"
        changeLabel="Change logo"
        onUploaded={onUploaded}
        onRemove={async () => undefined}
      />
    );

    expect(screen.getByText("Change logo")).toBeTruthy();
    expect(screen.getByText("Remove")).toBeTruthy();

    const input = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(["pdf"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(vi.mocked(notify.error)).toHaveBeenCalledWith(
        expect.stringContaining("image file")
      )
    );
    expect(filesApi.uploadFileViaHandler).not.toHaveBeenCalled();
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("calls onRemove when Remove is clicked", async () => {
    const onRemove = vi.fn(async () => undefined);
    render(
      <ImageUploadControl
        imageUrl="https://storage.example/current.png"
        alt="Logo"
        onUploaded={async () => undefined}
        onRemove={onRemove}
      />
    );

    fireEvent.click(screen.getByText("Remove"));
    await waitFor(() => expect(onRemove).toHaveBeenCalledTimes(1));
  });
});
