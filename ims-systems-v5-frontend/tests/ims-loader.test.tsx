import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ImsLoader, PageLoader } from "@/shared/components/ims-loader";

afterEach(cleanup);

describe("ImsLoader", () => {
  it("renders the decorative iMS mark with orbit, ring and core", () => {
    const { container } = render(<ImsLoader size="sm" />);
    const svg = container.querySelector("svg.ims-loader")!;
    expect(svg).toHaveAttribute("aria-hidden");
    expect(svg).toHaveClass("size-8");
    expect(svg.querySelector(".ims-loader-orbit")).toBeTruthy();
    expect(svg.querySelector(".ims-loader-ring")).toBeTruthy();
    expect(svg.querySelector(".ims-loader-core path")).toBeTruthy();
  });
});

describe("PageLoader", () => {
  it("announces its label as a status", () => {
    render(<PageLoader label="Loading risks…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading risks…");
  });

  it("fills the viewport in full-screen mode", () => {
    render(<PageLoader label="Checking session…" fullScreen />);
    expect(screen.getByRole("status")).toHaveClass("min-h-dvh");
  });

  it("renders inline in compact mode", () => {
    const { container } = render(<PageLoader label="Loading tasks…" compact />);
    expect(screen.getByRole("status")).not.toHaveClass("flex-col");
    expect(container.querySelector("svg.ims-loader")).toHaveClass("size-8");
  });
});
