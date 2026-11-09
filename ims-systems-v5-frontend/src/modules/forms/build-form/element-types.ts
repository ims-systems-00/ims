import type { ReactNode } from "react";
import type { FormElementType } from "../types";

export type ElementAttributes = Record<string, unknown>;

export type ElementDefinition = {
  type: FormElementType;
  label: string;
  category: "input" | "design";
  defaultAttributes: ElementAttributes;
  /** Design-time canvas preview */
  Designer: (props: {
    attributes: ElementAttributes;
    selected?: boolean;
  }) => ReactNode;
  /** Properties panel editor */
  Properties: (props: {
    attributes: ElementAttributes;
    onChange: (next: ElementAttributes) => void;
  }) => ReactNode;
  /** Runtime / preview response field */
  Response: (props: {
    attributes: ElementAttributes;
    value: unknown;
    onChange: (value: unknown) => void;
    disabled?: boolean;
  }) => ReactNode;
  validate: (value: unknown, attributes: ElementAttributes) => string | null;
};

export function attrString(
  attributes: ElementAttributes,
  key: string,
  fallback = ""
): string {
  const value = attributes[key];
  return typeof value === "string" ? value : fallback;
}

export function attrBool(
  attributes: ElementAttributes,
  key: string,
  fallback = false
): boolean {
  const value = attributes[key];
  return typeof value === "boolean" ? value : fallback;
}

export function attrOptions(
  attributes: ElementAttributes
): Array<{ label: string; value: string }> {
  const raw = attributes.options;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as { label?: unknown; value?: unknown };
      const label = typeof item.label === "string" ? item.label : "";
      const value = typeof item.value === "string" ? item.value : label;
      if (!label && !value) return null;
      return { label: label || value, value: value || label };
    })
    .filter((row): row is { label: string; value: string } => row != null);
}

export function requireIfNeeded(
  value: unknown,
  attributes: ElementAttributes
): string | null {
  if (!attrBool(attributes, "required")) return null;
  if (value == null || value === "") return "This field is required";
  if (Array.isArray(value) && value.length === 0) {
    return "This field is required";
  }
  return null;
}
