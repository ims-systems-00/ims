import type { ReactNode } from "react";
import type { FormElementType } from "../types";
import {
  ElementImageProperties,
  withElementImage,
} from "./element-image";
import {
  attrBool,
  attrOptions,
  attrString,
  requireIfNeeded,
  type ElementAttributes,
  type ElementDefinition,
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
      {label ? (
        <div className="text-sm font-medium">
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function TextProps({
  attributes,
  onChange,
  extras,
}: {
  attributes: ElementAttributes;
  onChange: (next: ElementAttributes) => void;
  extras?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <label className="block text-sm">
        Label
        <input
          className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
          value={attrString(attributes, "label")}
          onChange={(e) => onChange({ ...attributes, label: e.target.value })}
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
        Placeholder
        <input
          className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
          value={attrString(attributes, "placeholder")}
          onChange={(e) =>
            onChange({ ...attributes, placeholder: e.target.value })
          }
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
      {extras}
    </div>
  );
}

function OptionsProps({
  attributes,
  onChange,
}: {
  attributes: ElementAttributes;
  onChange: (next: ElementAttributes) => void;
}) {
  const options = attrOptions(attributes);
  return (
    <TextProps
      attributes={attributes}
      onChange={onChange}
      extras={
        <div className="space-y-2">
          <div className="text-sm font-medium">Options</div>
          {options.map((opt, index) => (
            <div key={index} className="flex gap-2">
              <input
                className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                value={opt.label}
                onChange={(e) => {
                  const next = [...options];
                  next[index] = {
                    label: e.target.value,
                    value: e.target.value,
                  };
                  onChange({ ...attributes, options: next });
                }}
              />
              <button
                type="button"
                className="text-xs text-destructive"
                onClick={() => {
                  onChange({
                    ...attributes,
                    options: options.filter((_, i) => i !== index),
                  });
                }}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-xs text-primary"
            onClick={() =>
              onChange({
                ...attributes,
                options: [
                  ...options,
                  {
                    label: `Option ${options.length + 1}`,
                    value: `option_${options.length + 1}`,
                  },
                ],
              })
            }
          >
            Add option
          </button>
        </div>
      }
    />
  );
}

function makeTextElement(
  type: FormElementType,
  label: string,
  inputType: string,
  multiline = false
): ElementDefinition {
  return {
    type,
    label,
    category: "input",
    defaultAttributes: {
      label,
      description: "",
      placeholder: "Text sample",
      required: false,
    },
    Designer: ({ attributes }) => (
      <FieldShell
        label={attrString(attributes, "label", label)}
        required={attrBool(attributes, "required")}
      >
        {multiline ? (
          <textarea
            disabled
            className="w-full rounded-md border border-dashed border-border px-2 py-1.5 text-sm"
            placeholder={attrString(attributes, "placeholder")}
            rows={3}
          />
        ) : (
          <input
            disabled
            type={inputType}
            className="w-full rounded-md border border-dashed border-border px-2 py-1.5 text-sm"
            placeholder={attrString(attributes, "placeholder")}
          />
        )}
      </FieldShell>
    ),
    Properties: (props) => <TextProps {...props} />,
    Response: ({ attributes, value, onChange, disabled }) => (
      <FieldShell
        label={attrString(attributes, "label", label)}
        required={attrBool(attributes, "required")}
      >
        {multiline ? (
          <textarea
            disabled={disabled}
            className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
            placeholder={attrString(attributes, "placeholder")}
            rows={4}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            disabled={disabled}
            type={inputType}
            className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
            placeholder={attrString(attributes, "placeholder")}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </FieldShell>
    ),
    validate: (value, attributes) => {
      const requiredError = requireIfNeeded(value, attributes);
      if (requiredError) return requiredError;
      if (
        type === "Email" &&
        typeof value === "string" &&
        value &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ) {
        return "Enter a valid email";
      }
      return null;
    },
  };
}

function makeChoiceElement(
  type: FormElementType,
  label: string,
  multiple: boolean
): ElementDefinition {
  return {
    type,
    label,
    category: "input",
    defaultAttributes: {
      label,
      description: "",
      required: false,
      options: [
        { label: "Option A", value: "a" },
        { label: "Option B", value: "b" },
      ],
    },
    Designer: ({ attributes }) => {
      const options = attrOptions(attributes);
      return (
        <FieldShell
          label={attrString(attributes, "label", label)}
          required={attrBool(attributes, "required")}
        >
          <div className="space-y-1.5">
            {options.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input type={multiple ? "checkbox" : "radio"} disabled />
                {opt.label}
              </label>
            ))}
          </div>
        </FieldShell>
      );
    },
    Properties: (props) => <OptionsProps {...props} />,
    Response: ({ attributes, value, onChange, disabled }) => {
      const options = attrOptions(attributes);
      const selected = multiple
        ? Array.isArray(value)
          ? (value as string[])
          : []
        : typeof value === "string"
          ? value
          : "";
      return (
        <FieldShell
          label={attrString(attributes, "label", label)}
          required={attrBool(attributes, "required")}
        >
          <div className="space-y-1.5">
            {options.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name={attrString(attributes, "label", label)}
                  disabled={disabled}
                  checked={
                    multiple
                      ? (selected as string[]).includes(opt.value)
                      : selected === opt.value
                  }
                  onChange={() => {
                    if (!multiple) {
                      onChange(opt.value);
                      return;
                    }
                    const set = new Set(selected as string[]);
                    if (set.has(opt.value)) set.delete(opt.value);
                    else set.add(opt.value);
                    onChange([...set]);
                  }}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </FieldShell>
      );
    },
    validate: requireIfNeeded,
  };
}

const IMAGE_DESIGN_TYPES = new Set(["Cover", "Header", "RichContent", "Alert"]);

const designText = (
  type: FormElementType,
  label: string,
  defaultContent: string
): ElementDefinition => {
  const supportsImage = IMAGE_DESIGN_TYPES.has(type);
  return {
    type,
    label,
    category: "design",
    defaultAttributes: {
      content: defaultContent,
      level: type === "Header" ? "h2" : undefined,
      ...(supportsImage
        ? {
            imageSrc: "",
            imageStorage: null,
            imagePosition: "above",
          }
        : {}),
    },
    Designer: ({ attributes }) => {
      let content: ReactNode;
      if (type === "Header") {
        content = (
          <h2 className="text-xl font-semibold">
            {attrString(attributes, "content", defaultContent)}
          </h2>
        );
      } else if (type === "Divider") {
        content = <hr className="border-border" />;
      } else if (type === "Alert") {
        content = (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {attrString(attributes, "content", defaultContent)}
          </div>
        );
      } else {
        content = (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {attrString(attributes, "content", defaultContent)}
          </p>
        );
      }
      return supportsImage ? withElementImage(attributes, content) : content;
    },
    Properties: ({ attributes, onChange }) => (
      <div className="space-y-3">
        <label className="block text-sm">
          Content
          <textarea
            className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
            rows={4}
            value={attrString(attributes, "content")}
            onChange={(e) =>
              onChange({ ...attributes, content: e.target.value })
            }
          />
        </label>
        {supportsImage ? (
          <ElementImageProperties
            attributes={attributes}
            onChange={onChange}
          />
        ) : null}
      </div>
    ),
    Response: ({ attributes }) => {
      const content = (
        <div className="text-sm whitespace-pre-wrap">
          {attrString(attributes, "content", defaultContent)}
        </div>
      );
      return supportsImage ? withElementImage(attributes, content) : content;
    },
    validate: () => null,
  };
};

const tableElement: ElementDefinition = {
  type: "Table",
  label: "Table",
  category: "input",
  defaultAttributes: {
    label: "Table",
    columns: ["Column 1", "Column 2", "Column 3"],
    rows: 2,
    required: false,
  },
  Designer: ({ attributes }) => {
    const columns = Array.isArray(attributes.columns)
      ? (attributes.columns as string[])
      : ["Column 1"];
    const rows = Number(attributes.rows) || 2;
    return (
      <FieldShell label={attrString(attributes, "label", "Table")}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="border border-dashed border-border px-2 py-1 text-left"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, r) => (
                <tr key={r}>
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="border border-dashed border-border px-2 py-1 text-muted-foreground"
                    >
                      …
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FieldShell>
    );
  },
  Properties: ({ attributes, onChange }) => {
    const columns = Array.isArray(attributes.columns)
      ? (attributes.columns as string[]).join(", ")
      : "";
    return (
      <div className="space-y-3">
        <label className="block text-sm">
          Label
          <input
            className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
            value={attrString(attributes, "label")}
            onChange={(e) => onChange({ ...attributes, label: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          Columns (comma-separated)
          <input
            className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
            value={columns}
            onChange={(e) =>
              onChange({
                ...attributes,
                columns: e.target.value
                  .split(",")
                  .map((part) => part.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <label className="block text-sm">
          Rows
          <input
            type="number"
            min={1}
            max={20}
            className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
            value={Number(attributes.rows) || 2}
            onChange={(e) =>
              onChange({ ...attributes, rows: Number(e.target.value) || 1 })
            }
          />
        </label>
      </div>
    );
  },
  Response: ({ attributes, value, onChange, disabled }) => {
    const columns = Array.isArray(attributes.columns)
      ? (attributes.columns as string[])
      : ["Column 1"];
    const rows = Number(attributes.rows) || 2;
    const grid =
      Array.isArray(value) && Array.isArray(value[0])
        ? (value as string[][])
        : Array.from({ length: rows }, () =>
            Array.from({ length: columns.length }, () => "")
          );
    return (
      <FieldShell label={attrString(attributes, "label", "Table")}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="border border-border px-2 py-1 text-left"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, r) => (
                <tr key={r}>
                  {columns.map((_, c) => (
                    <td key={c} className="border border-border p-1">
                      <input
                        disabled={disabled}
                        className="w-full px-1 py-0.5"
                        value={row[c] ?? ""}
                        onChange={(e) => {
                          const next = grid.map((line) => [...line]);
                          next[r]![c] = e.target.value;
                          onChange(next);
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FieldShell>
    );
  },
  validate: requireIfNeeded,
};

const ncOfiElement: ElementDefinition = {
  type: "NC_OFI",
  label: "NC/OFI",
  category: "input",
  defaultAttributes: {
    label: "Non-conformance / OFI",
    columns: ["Finding", "Severity", "Action"],
    rows: 2,
  },
  Designer: tableElement.Designer,
  Properties: tableElement.Properties,
  Response: tableElement.Response,
  validate: requireIfNeeded,
};

const consentElement: ElementDefinition = {
  type: "Consent",
  label: "Consent",
  category: "input",
  defaultAttributes: {
    label: "I agree to the terms",
    required: true,
  },
  Designer: ({ attributes }) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" disabled />
      {attrString(attributes, "label", "I agree")}
    </label>
  ),
  Properties: (props) => <TextProps {...props} />,
  Response: ({ attributes, value, onChange, disabled }) => (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        disabled={disabled}
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
      />
      {attrString(attributes, "label", "I agree")}
    </label>
  ),
  validate: (value, attributes) => {
    if (attrBool(attributes, "required") && !value) {
      return "Consent is required";
    }
    return null;
  },
};

const fileElement: ElementDefinition = {
  type: "FileDropzone",
  label: "File upload",
  category: "input",
  defaultAttributes: {
    label: "Upload files",
    required: false,
  },
  Designer: ({ attributes }) => (
    <FieldShell label={attrString(attributes, "label", "Upload files")}>
      <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
        Drag files here or click to browse
      </div>
    </FieldShell>
  ),
  Properties: (props) => <TextProps {...props} />,
  Response: ({ attributes, value, onChange, disabled }) => (
    <FieldShell label={attrString(attributes, "label", "Upload files")}>
      <input
        type="file"
        disabled={disabled}
        className="block w-full text-sm"
        onChange={(e) => {
          const file = e.target.files?.[0];
          onChange(
            file
              ? { name: file.name, size: file.size, type: file.type }
              : null
          );
        }}
      />
      {value && typeof value === "object" && "name" in (value as object) ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Selected: {String((value as { name: string }).name)}
        </p>
      ) : null}
    </FieldShell>
  ),
  validate: requireIfNeeded,
};

const locationElement: ElementDefinition = {
  type: "Location",
  label: "Location",
  category: "input",
  defaultAttributes: {
    label: "Location",
    placeholder: "Enter a location",
    required: false,
  },
  Designer: makeTextElement("Location", "Location", "text").Designer,
  Properties: (props) => <TextProps {...props} />,
  Response: makeTextElement("Location", "Location", "text").Response,
  validate: requireIfNeeded,
};

const dropDownElement: ElementDefinition = {
  type: "DropDown",
  label: "Dropdown",
  category: "input",
  defaultAttributes: {
    label: "Dropdown",
    required: false,
    options: [
      { label: "Select item", value: "" },
      { label: "Option A", value: "a" },
      { label: "Option B", value: "b" },
    ],
  },
  Designer: ({ attributes }) => (
    <FieldShell
      label={attrString(attributes, "label", "Dropdown")}
      required={attrBool(attributes, "required")}
    >
      <select
        disabled
        className="w-full rounded-md border border-dashed border-border px-2 py-1.5 text-sm"
      >
        {attrOptions(attributes).map((opt) => (
          <option key={opt.value}>{opt.label}</option>
        ))}
      </select>
    </FieldShell>
  ),
  Properties: (props) => <OptionsProps {...props} />,
  Response: ({ attributes, value, onChange, disabled }) => (
    <FieldShell
      label={attrString(attributes, "label", "Dropdown")}
      required={attrBool(attributes, "required")}
    >
      <select
        disabled={disabled}
        className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {attrOptions(attributes).map((opt) => (
          <option key={opt.value || opt.label} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldShell>
  ),
  validate: requireIfNeeded,
};

const definitions: ElementDefinition[] = [
  designText("Header", "Header", "Section title"),
  designText("RichContent", "Rich content", "Instructional text for respondents."),
  designText("Cover", "Cover", "Cover / introduction content"),
  designText("Conclusion", "Conclusion", "Closing content"),
  designText("Alert", "Alert", "Important notice for the respondent."),
  designText("Divider", "Divider", ""),
  makeTextElement("TextInput", "Text input", "text"),
  makeTextElement("LongText", "Long text", "text", true),
  makeTextElement("FullName", "Full name", "text"),
  makeTextElement("Email", "Email", "email"),
  makeTextElement("PhoneNumber", "Phone number", "tel"),
  makeTextElement("Address", "Address", "text", true),
  makeTextElement("DateInput", "Date", "date"),
  makeChoiceElement("RadioSingleChoice", "Single choice", false),
  makeChoiceElement("CheckBoxMultipleChoice", "Multiple choice", true),
  dropDownElement,
  locationElement,
  consentElement,
  fileElement,
  tableElement,
  ncOfiElement,
];

export const FormElements: Record<string, ElementDefinition> = Object.fromEntries(
  definitions.map((def) => [def.type, def])
);

/** Palette sections — FullName/Address registered but hidden by default. */
export const PALETTE_SECTIONS: Array<{
  title: string;
  types: FormElementType[];
}> = [
  {
    title: "Input elements",
    types: [
      "Header",
      "TextInput",
      "LongText",
      "Email",
      "PhoneNumber",
      "RadioSingleChoice",
      "CheckBoxMultipleChoice",
      "DropDown",
      "DateInput",
      "Location",
      "Consent",
      "FileDropzone",
      "Table",
      "NC_OFI",
    ],
  },
  {
    title: "Design elements",
    types: ["RichContent", "Divider", "Alert", "Cover", "Conclusion"],
  },
];

export function getElementDefinition(type: string): ElementDefinition | null {
  return FormElements[type] ?? null;
}
