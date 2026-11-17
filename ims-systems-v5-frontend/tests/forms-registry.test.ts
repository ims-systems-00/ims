import { describe, expect, it } from "vitest";
import {
  FormElements,
  PALETTE_SECTIONS,
  getElementDefinition,
} from "../src/modules/forms/build-form/registry";

describe("forms element registry", () => {
  it("registers core input and design elements", () => {
    expect(getElementDefinition("TextInput")).toBeTruthy();
    expect(getElementDefinition("Header")).toBeTruthy();
    expect(getElementDefinition("NC_OFI")).toBeTruthy();
    expect(getElementDefinition("FileDropzone")).toBeTruthy();
    expect(getElementDefinition("Matrix")).toBeTruthy();
    expect(Object.keys(FormElements).length).toBeGreaterThanOrEqual(15);
  });

  it("exposes palette sections without FullName/Address by default", () => {
    const types = PALETTE_SECTIONS.flatMap((section) => section.types);
    expect(types).toContain("TextInput");
    expect(types).toContain("Conclusion");
    expect(types).toContain("Matrix");
    expect(types).not.toContain("FullName");
    expect(types).not.toContain("Address");
  });

  it("validates required email fields", () => {
    const email = getElementDefinition("Email")!;
    expect(
      email.validate("", { label: "Email", required: true })
    ).toMatch(/required/i);
    expect(
      email.validate("not-an-email", { label: "Email", required: true })
    ).toMatch(/valid email/i);
    expect(
      email.validate("a@b.com", { label: "Email", required: true })
    ).toBeNull();
  });

  it("multiplies matrix scores and resolves rating bands", () => {
    const matrix = getElementDefinition("Matrix")!;
    const attributes = matrix.defaultAttributes;
    const axes = attributes.axes as Array<{ id: string }>;
    expect(
      matrix.validate(
        {
          selections: {
            [axes[0]!.id]: 2,
            [axes[1]!.id]: 3,
          },
          product: 6,
          bandLabel: "Medium",
        },
        attributes
      )
    ).toBeNull();
    expect(matrix.validate({ selections: {} }, attributes)).toBeNull();
    expect(
      matrix.validate({ selections: {} }, { ...attributes, required: true })
    ).toMatch(/select a score/i);
  });
});
