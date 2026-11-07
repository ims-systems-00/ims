import { describe, expect, it } from "vitest";
import {
  createFormBodySchema,
  createFormElementBodySchema,
  createSubmissionBodySchema,
  reorderFormElementBodySchema,
} from "../src/modules/forms/schemas";
import { FORMS_RESOURCE, FORM_ELEMENT_TYPES } from "../src/modules/forms/types";
import { ENFORCED_RESOURCE_TYPES } from "../src/security/openfga/enforced-resources";

describe("forms module schemas", () => {
  it("accepts form create payloads", () => {
    const parsed = createFormBodySchema.parse({
      title: "Audit Notes",
      description: "For auditors",
      elements: [{ type: "TextInput", attributes: { label: "Client" } }],
    });
    expect(parsed.title).toBe("Audit Notes");
    expect(parsed.elements?.[0]?.type).toBe("TextInput");
  });

  it("accepts element create + reorder payloads", () => {
    expect(
      createFormElementBodySchema.parse({
        type: "Header",
        attributes: { content: "Section 1" },
        afterElementId: null,
      }).type
    ).toBe("Header");
    expect(
      reorderFormElementBodySchema.parse({ afterElementId: null })
        .afterElementId
    ).toBeNull();
  });

  it("accepts submission responses", () => {
    const parsed = createSubmissionBodySchema.parse({
      responses: [
        {
          formElementId: "67aaaaaaaaaaaaaaaaaaaaaa",
          responseValue: "Acme Ltd",
        },
      ],
    });
    expect(parsed.responses).toHaveLength(1);
  });

  it("exposes forms resource and element catalogue", () => {
    expect(FORMS_RESOURCE).toBe("forms");
    expect(FORM_ELEMENT_TYPES).toContain("NC_OFI");
    expect(FORM_ELEMENT_TYPES).toContain("FileDropzone");
    expect(ENFORCED_RESOURCE_TYPES.has("forms")).toBe(true);
  });
});

describe("linked-list order walk", () => {
  it("orders elements by previous/next pointers", () => {
    const docs = [
      {
        id: "b",
        previousElementId: "a",
        nextElementId: "c",
      },
      {
        id: "c",
        previousElementId: "b",
        nextElementId: null,
      },
      {
        id: "a",
        previousElementId: null,
        nextElementId: "b",
      },
    ];
    const byId = new Map(docs.map((d) => [d.id, d]));
    let current = docs.find((d) => d.previousElementId == null) ?? null;
    const ordered: string[] = [];
    const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      ordered.push(current.id);
      seen.add(current.id);
      current = current.nextElementId
        ? byId.get(current.nextElementId) ?? null
        : null;
    }
    expect(ordered).toEqual(["a", "b", "c"]);
  });
});
