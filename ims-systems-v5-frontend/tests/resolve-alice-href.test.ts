import { describe, expect, it } from "vitest";
import {
  aliceAppPath,
  aliceLinkLabel,
  isAliceInAppHref,
  resolveAliceHref,
  rewriteAliceMarkdownAppUrls,
} from "../src/modules/ai/lib/resolve-alice-href";

describe("resolveAliceHref", () => {
  const origin = "https://app.imssystems.tech";

  it("keeps root-relative IMS paths", () => {
    expect(resolveAliceHref("/tasks?task=abc", origin)).toBe("/tasks?task=abc");
  });

  it("rewrites invented absolute IMS hosts to a BrowserRouter path", () => {
    expect(
      resolveAliceHref(
        "https://ims.example.com/tasks?task=6a466030ec006e6513e7ac79",
        origin
      )
    ).toBe("/tasks?task=6a466030ec006e6513e7ac79");
  });

  it("strips legacy hash-router document links", () => {
    expect(
      aliceAppPath(
        "http://localhost:3000/#/documents/repositories/67e67ecc37058ba760b2b116/nodes/67e6d018b34cd13031d6f682",
        "http://localhost:3000"
      )
    ).toBe(
      "/documents/repositories/67e67ecc37058ba760b2b116/nodes/67e6d018b34cd13031d6f682"
    );
  });

  it("leaves true external links alone", () => {
    expect(resolveAliceHref("https://gov.uk/guidance", origin)).toBe(
      "https://gov.uk/guidance"
    );
  });
});

describe("rewriteAliceMarkdownAppUrls", () => {
  const origin = "https://app.imssystems.tech";

  it("rewrites bare and markdown IMS URLs into View links", () => {
    const md =
      "Open [task](https://ims.example.com/tasks?task=abc) and https://fake.host/risks?risk=1.";
    expect(rewriteAliceMarkdownAppUrls(md, origin)).toBe(
      "Open [task](/tasks?task=abc) and [View risk](/risks?risk=1)."
    );
  });

  it("converts hash-router bare URLs to View document links", () => {
    const md =
      "See http://localhost:3000/#/documents/repositories/aaa/nodes/bbb";
    expect(rewriteAliceMarkdownAppUrls(md, "http://localhost:3000")).toBe(
      "See [View document](/documents/repositories/aaa/nodes/bbb)"
    );
  });

  it("detects in-app hrefs including hash routes", () => {
    expect(isAliceInAppHref("/tasks?task=1", origin)).toBe(true);
    expect(
      isAliceInAppHref("https://ims.example.com/tasks?task=1", origin)
    ).toBe(true);
    expect(
      isAliceInAppHref("http://localhost:3000/#/documents/repositories/a/nodes/b", origin)
    ).toBe(true);
    expect(isAliceInAppHref("https://example.com/about", origin)).toBe(false);
  });

  it("labels raw URLs as View …", () => {
    expect(
      aliceLinkLabel(
        "/documents/repositories/a/nodes/b",
        "http://localhost:3000/#/documents/repositories/a/nodes/b",
        origin
      )
    ).toBe("View document");
    expect(aliceLinkLabel("/tasks?task=1", "Safety walk", origin)).toBe(
      "Safety walk"
    );
  });

  it("hides bare ObjectId link labels", () => {
    expect(
      aliceLinkLabel(
        "/risks?risk=67aaaaaaaaaaaaaaaaaaaaaa",
        "67aaaaaaaaaaaaaaaaaaaaaa",
        origin
      )
    ).toBe("View risk");
  });
});
