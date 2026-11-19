import { useState } from "react";
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
  const [scope, setScope] = useState(initial?.scope ?? "");
  const [reqs, setReqs] = useState(initial?.reqs ?? "");
  const [fieldError, setFieldError] = useState<string | null>(null);

  function toggleStd(std: string) {
    setStds((prev) =>
      prev.includes(std) ? prev.filter((s) => s !== std) : [...prev, std]
    );
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
