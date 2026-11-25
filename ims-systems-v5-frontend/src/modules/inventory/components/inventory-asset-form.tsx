import { useState } from "react";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { inventoryAssetFormSchema } from "../schemas";
import {
  INVENTORY_CRITICALITIES,
  INVENTORY_STAGES,
  type CreateInventoryAssetInput,
  type InventoryAsset,
  type InventoryCategoryDef,
  type UpdateInventoryAssetInput,
} from "../types";

type InventoryAssetFormProps = {
  mode: "create" | "edit";
  initial?: InventoryAsset | null;
  categories: InventoryCategoryDef[];
  pending?: boolean;
  onSubmit: (
    values: CreateInventoryAssetInput | UpdateInventoryAssetInput
  ) => Promise<void>;
  onCancel?: () => void;
};

export function InventoryAssetForm({
  mode,
  initial,
  categories,
  pending,
  onSubmit,
  onCancel,
}: InventoryAssetFormProps) {
  const [tag, setTag] = useState(initial?.tag ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(
    initial?.category ?? categories[0]?.name ?? "General equipment"
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [custodian, setCustodian] = useState(initial?.custodian ?? "");
  const [stage, setStage] = useState(initial?.stage ?? "Requested");
  const [criticality, setCriticality] = useState(
    initial?.criticality ?? "Standard"
  );
  const [makeModel, setMakeModel] = useState(initial?.makeModel ?? "");
  const [serial, setSerial] = useState(initial?.serial ?? "");
  const [purchaseDate, setPurchaseDate] = useState(
    initial?.purchaseDate ?? ""
  );
  const [cost, setCost] = useState(
    initial?.cost != null ? String(initial.cost) : ""
  );
  const [supplier, setSupplier] = useState(initial?.supplier ?? "");
  const [warrantyEnds, setWarrantyEnds] = useState(
    initial?.warrantyEnds ?? ""
  );
  const [informationAsset, setInformationAsset] = useState(
    Boolean(initial?.informationAsset)
  );
  const [safetyNotes, setSafetyNotes] = useState(initial?.safetyNotes ?? "");
  const [labelPrinted, setLabelPrinted] = useState(
    Boolean(initial?.labelPrinted)
  );
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldError(null);
    const raw = {
      tag,
      name,
      category,
      location,
      custodian,
      stage: mode === "create" ? stage : undefined,
      criticality,
      makeModel,
      serial,
      purchaseDate: purchaseDate || null,
      cost: cost === "" ? null : Number(cost),
      supplier,
      warrantyEnds: warrantyEnds || null,
      informationAsset,
      safetyNotes,
      labelPrinted,
    };
    const parsed = inventoryAssetFormSchema.safeParse(raw);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    const data = parsed.data;
    await onSubmit({
      tag: data.tag.toUpperCase(),
      name: data.name,
      category: data.category,
      location: data.location || "",
      custodian: data.custodian || "",
      ...(mode === "create" ? { stage: data.stage ?? "Requested" } : {}),
      criticality: data.criticality,
      makeModel: data.makeModel || "",
      serial: data.serial || "",
      purchaseDate: data.purchaseDate || null,
      cost: data.cost ?? null,
      supplier: data.supplier || "",
      warrantyEnds: data.warrantyEnds || null,
      informationAsset: Boolean(data.informationAsset),
      safetyNotes: data.safetyNotes || "",
      labelPrinted: Boolean(data.labelPrinted),
    });
  }

  return (
    <form className="space-y-5" onSubmit={(e) => void handleSubmit(e)}>
      <FormSection title="Identity">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Asset tag" required>
            <input
              className="ims-field"
              value={tag}
              disabled={pending}
              placeholder="ME-0412"
              onChange={(e) => setTag(e.target.value)}
            />
          </FormField>
          <FormField label="Category" required>
            <select
              className="ims-select ims-field"
              value={category}
              disabled={pending}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <FormField label="Name / description" required>
          <input
            className="ims-field"
            value={name}
            disabled={pending}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Make / model">
            <input
              className="ims-field"
              value={makeModel}
              disabled={pending}
              onChange={(e) => setMakeModel(e.target.value)}
            />
          </FormField>
          <FormField label="Serial">
            <input
              className="ims-field"
              value={serial}
              disabled={pending}
              onChange={(e) => setSerial(e.target.value)}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Ownership & location">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Location (Site · area)">
            <input
              className="ims-field"
              value={location}
              disabled={pending}
              placeholder="Sheffield · Lab 2"
              onChange={(e) => setLocation(e.target.value)}
            />
          </FormField>
          <FormField label="Custodian">
            <input
              className="ims-field"
              value={custodian}
              disabled={pending}
              onChange={(e) => setCustodian(e.target.value)}
            />
          </FormField>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {mode === "create" ? (
            <FormField label="Stage">
              <select
                className="ims-select ims-field"
                value={stage}
                disabled={pending}
                onChange={(e) =>
                  setStage(e.target.value as (typeof INVENTORY_STAGES)[number])
                }
              >
                {INVENTORY_STAGES.filter(
                  (s) => s !== "Disposed" && s !== "Retired"
                ).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FormField>
          ) : null}
          <FormField label="Criticality">
            <select
              className="ims-select ims-field"
              value={criticality}
              disabled={pending}
              onChange={(e) =>
                setCriticality(
                  e.target.value as (typeof INVENTORY_CRITICALITIES)[number]
                )
              }
            >
              {INVENTORY_CRITICALITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Purchase">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Purchase date">
            <input
              type="date"
              className="ims-field"
              value={purchaseDate}
              disabled={pending}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </FormField>
          <FormField label="Cost">
            <input
              type="number"
              min={0}
              step="0.01"
              className="ims-field"
              value={cost}
              disabled={pending}
              onChange={(e) => setCost(e.target.value)}
            />
          </FormField>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Supplier">
            <input
              className="ims-field"
              value={supplier}
              disabled={pending}
              onChange={(e) => setSupplier(e.target.value)}
            />
          </FormField>
          <FormField label="Warranty ends">
            <input
              type="date"
              className="ims-field"
              value={warrantyEnds}
              disabled={pending}
              onChange={(e) => setWarrantyEnds(e.target.value)}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Flags & notes">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={informationAsset}
            disabled={pending}
            onChange={(e) => setInformationAsset(e.target.checked)}
          />
          Information asset (holds data)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={labelPrinted}
            disabled={pending}
            onChange={(e) => setLabelPrinted(e.target.checked)}
          />
          QR label printed
        </label>
        <FormField label="Safety / usage notes (shown on scan)">
          <textarea
            className="ims-field min-h-[72px]"
            value={safetyNotes}
            disabled={pending}
            onChange={(e) => setSafetyNotes(e.target.value)}
          />
        </FormField>
      </FormSection>

      {fieldError ? (
        <p className="text-sm text-destructive">{fieldError}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {mode === "create" ? "Create asset" : "Save changes"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
