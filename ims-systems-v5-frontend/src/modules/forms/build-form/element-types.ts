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

/** Sentinel value for choice “Other (please specify)”. */
export const OTHER_CHOICE_VALUE = "__other__";

export type OtherChoiceValue = { other: string };

/** Multiple choice when Other is selected (keeps plain `string[]` otherwise). */
export type MultipleChoiceOtherValue = {
  selected: string[];
  other: string;
};

export function isOtherChoiceValue(
  value: unknown
): value is OtherChoiceValue {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "other" in (value as object) &&
    !("selected" in (value as object)) &&
    typeof (value as { other: unknown }).other === "string"
  );
}

export function isMultipleChoiceOtherValue(
  value: unknown
): value is MultipleChoiceOtherValue {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Array.isArray((value as { selected?: unknown }).selected) &&
    typeof (value as { other?: unknown }).other === "string"
  );
}

export function singleChoiceSelection(value: unknown): string {
  if (typeof value === "string") return value;
  if (isOtherChoiceValue(value)) return OTHER_CHOICE_VALUE;
  return "";
}

export function singleChoiceOtherText(value: unknown): string {
  return isOtherChoiceValue(value) ? value.other : "";
}

export function multipleChoiceSelection(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (isMultipleChoiceOtherValue(value)) {
    return value.selected.filter(
      (entry): entry is string => typeof entry === "string"
    );
  }
  return [];
}

export function multipleChoiceOtherText(value: unknown): string {
  return isMultipleChoiceOtherValue(value) ? value.other : "";
}

/** Persist Other text only while Other is checked; otherwise keep a plain string[]. */
export function buildMultipleChoiceValue(
  selected: string[],
  otherText: string
): string[] | MultipleChoiceOtherValue {
  if (selected.includes(OTHER_CHOICE_VALUE)) {
    return { selected, other: otherText };
  }
  return selected.filter((entry) => entry !== OTHER_CHOICE_VALUE);
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

/** One scored axis in a Matrix element (e.g. Likelihood). */
export type MatrixAxisLevel = {
  score: number;
  label: string;
};

export type MatrixAxis = {
  id: string;
  name: string;
  /** Inclusive score range start (default 1). */
  scoreMin: number;
  /** Inclusive score range end (default 3). */
  scoreMax: number;
  levels: MatrixAxisLevel[];
};

/** Product band description (e.g. 1–3 → Low). */
export type MatrixRatingBand = {
  min: number;
  max: number;
  label: string;
};

export type MatrixResponseValue = {
  selections: Record<string, number>;
  product: number | null;
  bandLabel: string | null;
};

export function defaultMatrixAxes(): MatrixAxis[] {
  return [
    {
      id: "axis_likelihood",
      name: "Likelihood (L)",
      scoreMin: 1,
      scoreMax: 3,
      levels: [
        { score: 1, label: "Unlikely" },
        { score: 2, label: "Possible" },
        { score: 3, label: "Likely" },
      ],
    },
    {
      id: "axis_severity",
      name: "Severity (S)",
      scoreMin: 1,
      scoreMax: 3,
      levels: [
        { score: 1, label: "Minor Injury" },
        { score: 2, label: "Serious Injury" },
        { score: 3, label: "Major Injury/Fatality" },
      ],
    },
  ];
}

export function defaultMatrixRatingBands(): MatrixRatingBand[] {
  return [
    { min: 1, max: 3, label: "Low" },
    { min: 4, max: 6, label: "Medium" },
    { min: 7, max: 9, label: "High" },
  ];
}

function asPositiveInt(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.round(n));
}

export function syncMatrixAxisLevels(axis: MatrixAxis): MatrixAxis {
  const scoreMin = Math.min(axis.scoreMin, axis.scoreMax);
  const scoreMax = Math.max(axis.scoreMin, axis.scoreMax);
  const byScore = new Map(axis.levels.map((level) => [level.score, level.label]));
  const levels: MatrixAxisLevel[] = [];
  for (let score = scoreMin; score <= scoreMax; score += 1) {
    levels.push({
      score,
      label: byScore.get(score) ?? "",
    });
  }
  return { ...axis, scoreMin, scoreMax, levels };
}

export function attrMatrixAxes(attributes: ElementAttributes): MatrixAxis[] {
  const raw = attributes.axes;
  if (!Array.isArray(raw) || raw.length === 0) return defaultMatrixAxes();
  return raw
    .map((row, index) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      const id =
        typeof item.id === "string" && item.id
          ? item.id
          : `axis_${index + 1}`;
      const name =
        typeof item.name === "string" && item.name.trim()
          ? item.name
          : `Option ${index + 1}`;
      const scoreMin = asPositiveInt(item.scoreMin, 1);
      const scoreMax = asPositiveInt(item.scoreMax, 3);
      const levelsRaw = Array.isArray(item.levels) ? item.levels : [];
      const levels: MatrixAxisLevel[] = levelsRaw
        .map((level) => {
          if (!level || typeof level !== "object") return null;
          const entry = level as { score?: unknown; label?: unknown };
          const score = asPositiveInt(entry.score, 0);
          if (score < 1) return null;
          return {
            score,
            label: typeof entry.label === "string" ? entry.label : "",
          };
        })
        .filter((level): level is MatrixAxisLevel => level != null);
      return syncMatrixAxisLevels({
        id,
        name,
        scoreMin,
        scoreMax,
        levels,
      });
    })
    .filter((axis): axis is MatrixAxis => axis != null);
}

export function attrMatrixRatingBands(
  attributes: ElementAttributes
): MatrixRatingBand[] {
  const raw = attributes.ratingBands;
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaultMatrixRatingBands();
  }
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      const min = asPositiveInt(item.min, 1);
      const max = asPositiveInt(item.max, min);
      const label = typeof item.label === "string" ? item.label : "";
      return { min: Math.min(min, max), max: Math.max(min, max), label };
    })
    .filter((band): band is MatrixRatingBand => band != null);
}

/** Pull abbreviation from “Name (L)” or fall back to first letter. */
export function matrixAxisAbbreviation(name: string, index: number): string {
  const match = name.match(/\(([A-Za-z0-9]+)\)\s*$/);
  if (match?.[1]) return match[1].toUpperCase();
  const letter = name.trim().charAt(0);
  return letter ? letter.toUpperCase() : String.fromCharCode(65 + index);
}

export function matrixFormulaLabel(
  axes: MatrixAxis[],
  resultLabel: string
): string {
  const factors = axes
    .map((axis, index) => matrixAxisAbbreviation(axis.name, index))
    .join(" × ");
  const title = resultLabel.trim() || "Result";
  return factors ? `${title} = ${factors}` : title;
}

export function findMatrixBandLabel(
  product: number,
  bands: MatrixRatingBand[]
): string | null {
  const match = bands.find(
    (band) => product >= band.min && product <= band.max
  );
  return match?.label?.trim() ? match.label.trim() : null;
}

export function parseMatrixResponseValue(
  value: unknown
): MatrixResponseValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { selections: {}, product: null, bandLabel: null };
  }
  const raw = value as Record<string, unknown>;
  const selections: Record<string, number> = {};
  if (raw.selections && typeof raw.selections === "object") {
    for (const [key, entry] of Object.entries(
      raw.selections as Record<string, unknown>
    )) {
      const score = Number(entry);
      if (Number.isFinite(score) && score > 0) {
        selections[key] = Math.round(score);
      }
    }
  }
  const product =
    typeof raw.product === "number" && Number.isFinite(raw.product)
      ? raw.product
      : null;
  const bandLabel =
    typeof raw.bandLabel === "string" && raw.bandLabel.trim()
      ? raw.bandLabel.trim()
      : null;
  return { selections, product, bandLabel };
}

export function buildMatrixResponseValue(
  axes: MatrixAxis[],
  selections: Record<string, number>,
  bands: MatrixRatingBand[]
): MatrixResponseValue {
  const next: Record<string, number> = {};
  for (const axis of axes) {
    const score = selections[axis.id];
    if (
      typeof score !== "number" ||
      !Number.isFinite(score) ||
      score < axis.scoreMin ||
      score > axis.scoreMax
    ) {
      continue;
    }
    next[axis.id] = Math.round(score);
  }
  const complete = axes.every((axis) => next[axis.id] != null);
  const product = complete
    ? axes.reduce((acc, axis) => acc * (next[axis.id] ?? 1), 1)
    : null;
  return {
    selections: next,
    product,
    bandLabel: product == null ? null : findMatrixBandLabel(product, bands),
  };
}
