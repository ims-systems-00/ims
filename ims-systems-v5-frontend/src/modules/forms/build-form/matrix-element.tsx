import type { ReactNode } from "react";
import {
  attrBool,
  attrMatrixAxes,
  attrMatrixRatingBands,
  attrString,
  buildMatrixResponseValue,
  defaultMatrixAxes,
  defaultMatrixRatingBands,
  matrixFormulaLabel,
  parseMatrixResponseValue,
  syncMatrixAxisLevels,
  type ElementAttributes,
  type ElementDefinition,
  type MatrixAxis,
  type MatrixRatingBand,
} from "./element-types";

function FieldShell({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </div>
      {children}
    </div>
  );
}

function MatrixBandsSummary({ bands }: { bands: MatrixRatingBand[] }) {
  if (bands.length === 0) return null;
  return (
    <div className="rounded-md border border-border-subtle bg-muted/20 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
      <div className="font-medium text-foreground">Range</div>
      <ul className="mt-1 space-y-0.5">
        {bands.map((band, index) => (
          <li key={`${band.min}-${band.max}-${index}`}>
            {band.min}–{band.max}
            {band.label ? ` ${band.label}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MatrixResultPanel({
  formula,
  product,
  bandLabel,
}: {
  formula: string;
  product: number | null;
  bandLabel: string | null;
}) {
  return (
    <div className="space-y-2 rounded-md border border-border bg-surface px-3 py-2.5">
      <p className="text-sm font-medium">{formula}</p>
      <p className="text-sm">
        Score:{" "}
        <span className="font-semibold tabular-nums">
          {product == null ? "—" : product}
        </span>
        {bandLabel ? (
          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {bandLabel}
          </span>
        ) : null}
      </p>
    </div>
  );
}

function updateAxes(
  attributes: ElementAttributes,
  axes: MatrixAxis[]
): ElementAttributes {
  return { ...attributes, axes };
}

function updateBands(
  attributes: ElementAttributes,
  ratingBands: MatrixRatingBand[]
): ElementAttributes {
  return { ...attributes, ratingBands };
}

export const matrixElement: ElementDefinition = {
  type: "Matrix",
  label: "Matrix",
  category: "input",
  defaultAttributes: {
    label: "Risk Matrix",
    description: "",
    required: false,
    resultLabel: "Risk Rating (R)",
    axes: defaultMatrixAxes(),
    ratingBands: defaultMatrixRatingBands(),
  },
  Designer: ({ attributes }) => {
    const axes = attrMatrixAxes(attributes);
    const bands = attrMatrixRatingBands(attributes);
    const formula = matrixFormulaLabel(
      axes,
      attrString(attributes, "resultLabel", "Risk Rating (R)")
    );
    return (
      <FieldShell
        label={attrString(attributes, "label", "Risk Matrix")}
        required={attrBool(attributes, "required")}
      >
        <div className="space-y-3">
          {axes.map((axis) => (
            <div key={axis.id} className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                {axis.name}
              </div>
              <div className="space-y-1">
                {axis.levels.map((level) => (
                  <label
                    key={level.score}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input type="radio" disabled />
                    <span>
                      {level.score}
                      {level.label ? ` – ${level.label}` : ""}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <MatrixResultPanel formula={formula} product={null} bandLabel={null} />
          <MatrixBandsSummary bands={bands} />
        </div>
      </FieldShell>
    );
  },
  Properties: ({ attributes, onChange }) => {
    const axes = attrMatrixAxes(attributes);
    const bands = attrMatrixRatingBands(attributes);

    function patchAxis(index: number, patch: Partial<MatrixAxis>) {
      const next = axes.map((axis, i) =>
        i === index ? syncMatrixAxisLevels({ ...axis, ...patch }) : axis
      );
      onChange(updateAxes(attributes, next));
    }

    function patchLevel(axisIndex: number, score: number, label: string) {
      const axis = axes[axisIndex];
      if (!axis) return;
      patchAxis(axisIndex, {
        levels: axis.levels.map((level) =>
          level.score === score ? { ...level, label } : level
        ),
      });
    }

    function patchBand(index: number, patch: Partial<MatrixRatingBand>) {
      const next = bands.map((band, i) =>
        i === index ? { ...band, ...patch } : band
      );
      onChange(updateBands(attributes, next));
    }

    return (
      <div className="space-y-4">
        <label className="block text-sm">
          Label
          <input
            className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
            value={attrString(attributes, "label")}
            onChange={(e) =>
              onChange({ ...attributes, label: e.target.value })
            }
          />
        </label>
        <label className="block text-sm">
          Description
          <textarea
            className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
            rows={2}
            value={attrString(attributes, "description")}
            onChange={(e) =>
              onChange({ ...attributes, description: e.target.value })
            }
          />
        </label>
        <label className="block text-sm">
          Result label
          <input
            className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
            value={attrString(attributes, "resultLabel", "Risk Rating (R)")}
            onChange={(e) =>
              onChange({ ...attributes, resultLabel: e.target.value })
            }
            placeholder="Risk Rating (R)"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={attrBool(attributes, "required")}
            onChange={(e) =>
              onChange({ ...attributes, required: e.target.checked })
            }
          />
          Required
        </label>

        <div className="space-y-3">
          <div className="text-sm font-medium">Options</div>
          <p className="text-[0.75rem] text-muted-foreground">
            Each option has a score range. Edit the text shown beside every
            score. The form multiplies the selected scores.
          </p>
          {axes.map((axis, axisIndex) => (
            <div
              key={axis.id}
              className="space-y-2 rounded-md border border-border-subtle px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Option {axisIndex + 1}
                </span>
                {axes.length > 2 ? (
                  <button
                    type="button"
                    className="text-xs text-destructive"
                    onClick={() =>
                      onChange(
                        updateAxes(
                          attributes,
                          axes.filter((_, i) => i !== axisIndex)
                        )
                      )
                    }
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <label className="block text-sm">
                Name
                <input
                  className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
                  value={axis.name}
                  onChange={(e) =>
                    patchAxis(axisIndex, { name: e.target.value })
                  }
                  placeholder="Likelihood (L)"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm">
                  Score from
                  <input
                    type="number"
                    min={1}
                    max={20}
                    className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
                    value={axis.scoreMin}
                    onChange={(e) =>
                      patchAxis(axisIndex, {
                        scoreMin: Number(e.target.value) || 1,
                      })
                    }
                  />
                </label>
                <label className="block text-sm">
                  Score to
                  <input
                    type="number"
                    min={1}
                    max={20}
                    className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
                    value={axis.scoreMax}
                    onChange={(e) =>
                      patchAxis(axisIndex, {
                        scoreMax: Number(e.target.value) || 1,
                      })
                    }
                  />
                </label>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">
                  Score labels
                </div>
                {axis.levels.map((level) => (
                  <div key={level.score} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-muted-foreground">
                      {level.score}
                    </span>
                    <input
                      className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                      value={level.label}
                      onChange={(e) =>
                        patchLevel(axisIndex, level.score, e.target.value)
                      }
                      placeholder="Label"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {axes.length < 4 ? (
            <button
              type="button"
              className="text-xs text-primary"
              onClick={() => {
                const nextIndex = axes.length + 1;
                onChange(
                  updateAxes(attributes, [
                    ...axes,
                    syncMatrixAxisLevels({
                      id: `axis_${Date.now()}`,
                      name: `Option ${nextIndex}`,
                      scoreMin: 1,
                      scoreMax: 3,
                      levels: [],
                    }),
                  ])
                );
              }}
            >
              Add option
            </button>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Score range description</div>
          <p className="text-[0.75rem] text-muted-foreground">
            Describe what the multiplied score means (e.g. 1–3 Low, 4–6 Medium).
          </p>
          {bands.map((band, index) => (
            <div
              key={`${band.min}-${band.max}-${index}`}
              className="flex flex-wrap items-end gap-2 rounded-md border border-border-subtle px-2.5 py-2"
            >
              <label className="block text-xs">
                From
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-16 rounded-md border border-border px-2 py-1.5 text-sm"
                  value={band.min}
                  onChange={(e) =>
                    patchBand(index, { min: Number(e.target.value) || 1 })
                  }
                />
              </label>
              <label className="block text-xs">
                To
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-16 rounded-md border border-border px-2 py-1.5 text-sm"
                  value={band.max}
                  onChange={(e) =>
                    patchBand(index, { max: Number(e.target.value) || 1 })
                  }
                />
              </label>
              <label className="min-w-0 flex-1 block text-xs">
                Meaning
                <input
                  className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
                  value={band.label}
                  onChange={(e) => patchBand(index, { label: e.target.value })}
                  placeholder="Low"
                />
              </label>
              <button
                type="button"
                className="shrink-0 pb-1.5 text-xs text-destructive"
                onClick={() =>
                  onChange(
                    updateBands(
                      attributes,
                      bands.filter((_, i) => i !== index)
                    )
                  )
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-xs text-primary"
            onClick={() =>
              onChange(
                updateBands(attributes, [
                  ...bands,
                  { min: 1, max: 1, label: "" },
                ])
              )
            }
          >
            Add range
          </button>
        </div>
      </div>
    );
  },
  Response: ({ attributes, value, onChange, disabled }) => {
    const axes = attrMatrixAxes(attributes);
    const bands = attrMatrixRatingBands(attributes);
    const parsed = parseMatrixResponseValue(value);
    const built = buildMatrixResponseValue(
      axes,
      parsed.selections,
      bands
    );
    const formula = matrixFormulaLabel(
      axes,
      attrString(attributes, "resultLabel", "Risk Rating (R)")
    );
    const description = attrString(attributes, "description");

    return (
      <FieldShell
        label={attrString(attributes, "label", "Risk Matrix")}
        required={attrBool(attributes, "required")}
      >
        <div className="space-y-3">
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
          {axes.map((axis) => (
            <fieldset key={axis.id} className="space-y-1.5">
              <legend className="text-sm font-medium">{axis.name}</legend>
              <div className="space-y-1.5">
                {axis.levels.map((level) => {
                  const checked = built.selections[axis.id] === level.score;
                  return (
                    <label
                      key={level.score}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        name={`${attrString(attributes, "label", "matrix")}-${axis.id}`}
                        disabled={disabled}
                        checked={checked}
                        onChange={() =>
                          onChange(
                            buildMatrixResponseValue(
                              axes,
                              {
                                ...built.selections,
                                [axis.id]: level.score,
                              },
                              bands
                            )
                          )
                        }
                      />
                      <span>
                        {level.score}
                        {level.label ? ` – ${level.label}` : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <MatrixResultPanel
            formula={formula}
            product={built.product}
            bandLabel={built.bandLabel}
          />
          <MatrixBandsSummary bands={bands} />
        </div>
      </FieldShell>
    );
  },
  validate: (value, attributes) => {
    const axes = attrMatrixAxes(attributes);
    const required = attrBool(attributes, "required");
    const parsed = parseMatrixResponseValue(value);
    const built = buildMatrixResponseValue(
      axes,
      parsed.selections,
      attrMatrixRatingBands(attributes)
    );

    if (!required && Object.keys(built.selections).length === 0) {
      return null;
    }

    for (const axis of axes) {
      if (built.selections[axis.id] == null) {
        return `Select a score for ${axis.name}`;
      }
    }
    return null;
  },
};
