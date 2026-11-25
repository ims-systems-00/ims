import { useState } from "react";
import { X } from "lucide-react";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import {
  createAslSupplierFormSchema,
  updateAslSupplierFormSchema,
} from "../schemas";
import {
  ASL_CATEGORIES,
  ASL_CRITICALITIES,
  ASL_STANDARDS,
  type AslSupplier,
  type CreateAslSupplierInput,
  type UpdateAslSupplierInput,
} from "../types";

const PREFIXED_STANDARDS = new Set<string>(ASL_STANDARDS);

type AslSupplierFormProps = {
  mode: "create" | "edit";
  initial?: AslSupplier | null;
  pending?: boolean;
  onSubmit: (values: CreateAslSupplierInput | UpdateAslSupplierInput) => Promise<void>;
  onCancel?: () => void;
};

export function AslSupplierForm({
  mode,
  initial,
  pending,
  onSubmit,
  onCancel,
}: AslSupplierFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [cat, setCat] = useState(initial?.cat ?? "Raw materials");
  const [crit, setCrit] = useState(initial?.crit ?? "Standard");
  const [contact, setContact] = useState(initial?.contact ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [stds, setStds] = useState<string[]>(initial?.stds ?? ["ISO 9001"]);
  const [customStdDraft, setCustomStdDraft] = useState("");
  const [scope, setScope] = useState(initial?.scope ?? "");
  const [reqs, setReqs] = useState(initial?.reqs ?? "");
  const [evalDue, setEvalDue] = useState(initial?.evalDue ?? "");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const customStds = stds.filter((s) => !PREFIXED_STANDARDS.has(s));

  function toggleStd(std: string) {
    setStds((prev) =>
      prev.includes(std) ? prev.filter((s) => s !== std) : [...prev, std]
    );
  }

  function addCustomStd() {
    const value = customStdDraft.trim();
    if (!value) return;
    const exists = stds.some((s) => s.toLowerCase() === value.toLowerCase());
    if (exists) {
      setCustomStdDraft("");
      return;
    }
    if (stds.length >= 20) {
      setFieldError("At most 20 standards allowed");
      return;
    }
    setStds((prev) => [...prev, value]);
    setCustomStdDraft("");
  }

  function removeCustomStd(std: string) {
    setStds((prev) => prev.filter((s) => s !== std));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldError(null);
    const raw = {
      name,
      cat,
      crit,
      contact,
      email,
      stds,
      scope,
      reqs,
      evalDue: evalDue || null,
    };
    const parsed =
      mode === "create"
        ? createAslSupplierFormSchema.safeParse(raw)
        : updateAslSupplierFormSchema.safeParse(raw);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    await onSubmit({
      name: parsed.data.name,
      cat: parsed.data.cat,
      crit: parsed.data.crit,
      contact: parsed.data.contact || "",
      email: parsed.data.email || "",
      stds: parsed.data.stds,
      scope: parsed.data.scope || "",
      reqs: parsed.data.reqs || "",
      evalDue: parsed.data.evalDue || null,
    });
  }

  return (
    <form className="space-y-5" onSubmit={(e) => void handleSubmit(e)}>
      <FormSection title="Identity">
        <FormField label="Name" required>
          <input
            className="ims-field"
            value={name}
            disabled={pending}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Category">
            <select
              className="ims-select ims-field"
              value={cat}
              disabled={pending}
              onChange={(e) => setCat(e.target.value)}
            >
              {ASL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Criticality">
            <select
              className="ims-select ims-field"
              value={crit}
              disabled={pending}
              onChange={(e) =>
                setCrit(e.target.value as (typeof ASL_CRITICALITIES)[number])
              }
            >
              {ASL_CRITICALITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Contact">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Contact name">
            <input
              className="ims-field"
              value={contact}
              disabled={pending}
              onChange={(e) => setContact(e.target.value)}
            />
          </FormField>
          <FormField label="Email">
            <input
              className="ims-field"
              type="email"
              value={email}
              disabled={pending}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Standards">
        <div className="flex flex-wrap gap-3">
          {ASL_STANDARDS.map((std) => (
            <label key={std} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={stds.includes(std)}
                disabled={pending}
                onChange={() => toggleStd(std)}
              />
              {std}
            </label>
          ))}
        </div>
        <FormField
          label="Custom standard"
          description="Add organisation-specific or other standards."
        >
          <div className="flex gap-2">
            <input
              className="ims-field flex-1"
              value={customStdDraft}
              disabled={pending}
              maxLength={80}
              placeholder="e.g. AS9100, IATF 16949"
              onChange={(e) => setCustomStdDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomStd();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={pending || !customStdDraft.trim()}
              onClick={addCustomStd}
            >
              Add
            </Button>
          </div>
        </FormField>
        {customStds.length ? (
          <div className="flex flex-wrap gap-2">
            {customStds.map((std) => (
              <span
                key={std}
                className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-muted/40 px-2 py-1 text-xs"
              >
                {std}
                <button
                  type="button"
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                  disabled={pending}
                  aria-label={`Remove ${std}`}
                  onClick={() => removeCustomStd(std)}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </FormSection>

      <FormSection title="Evaluation">
        <FormField
          label="Next evaluation due"
          description="Optional. When set, email and in-app alerts fire on this date."
        >
          <input
            className="ims-field"
            type="date"
            value={evalDue || ""}
            disabled={pending}
            onChange={(e) => setEvalDue(e.target.value)}
          />
        </FormField>
      </FormSection>

      <FormSection
        title="Scope & requirements"
        description="Requirements communicated to the supplier (ISO 8.4.3)."
      >
        <FormField label="Scope of supply">
          <textarea
            className="ims-field min-h-[4rem] py-2"
            value={scope}
            disabled={pending}
            onChange={(e) => setScope(e.target.value)}
          />
        </FormField>
        <FormField label="Requirements to supplier">
          <textarea
            className="ims-field min-h-[4rem] py-2"
            value={reqs}
            disabled={pending}
            onChange={(e) => setReqs(e.target.value)}
          />
        </FormField>
      </FormSection>

      {fieldError ? (
        <p className="text-sm text-destructive">{fieldError}</p>
      ) : null}

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {mode === "create" ? "Create supplier" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
