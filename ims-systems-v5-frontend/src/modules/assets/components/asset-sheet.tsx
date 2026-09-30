import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/shared/components/ui/button";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import { AssetDetails } from "./asset-details";
import { AssetForm, AssetFormActions } from "./asset-form";
import { SoftwareExtras } from "./software-extras";
import {
  useAssetQuery,
  useCreateHardwareMutation,
  useCreateInformationMutation,
  useCreatePeopleMutation,
  useCreatePremiseMutation,
  useCreateSoftwareMutation,
  useDeleteAssetMutation,
  useUpdateHardwareMutation,
  useUpdateInformationMutation,
  useUpdatePeopleMutation,
  useUpdatePremiseMutation,
  useUpdateSoftwareMutation,
} from "../hooks/use-assets";
import {
  ASSET_CATEGORY_META,
  assetDisplayName,
  type AnyAsset,
  type AssetCategory,
  type SoftwareAsset,
} from "../types";

export type AssetSheetMode = "create" | "view" | "edit";

type AssetSheetProps = {
  category: AssetCategory;
  open: boolean;
  mode: AssetSheetMode;
  assetId?: string | null;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: AssetSheetMode) => void;
  onCreated?: (asset: AnyAsset) => void;
  onDeleted?: () => void;
};

export function AssetSheet({
  category,
  open,
  mode,
  assetId,
  onOpenChange,
  onModeChange,
  onCreated,
  onDeleted,
}: AssetSheetProps) {
  const meta = ASSET_CATEGORY_META[category];
  const [confirmOpen, setConfirmOpen] = useState(false);
  const assetQuery = useAssetQuery(
    category,
    mode === "create" ? undefined : (assetId ?? undefined)
  );
  const createHardware = useCreateHardwareMutation();
  const updateHardware = useUpdateHardwareMutation(assetId ?? "");
  const createSoftware = useCreateSoftwareMutation();
  const updateSoftware = useUpdateSoftwareMutation(assetId ?? "");
  const createPeople = useCreatePeopleMutation();
  const updatePeople = useUpdatePeopleMutation(assetId ?? "");
  const createPremise = useCreatePremiseMutation();
  const updatePremise = useUpdatePremiseMutation(assetId ?? "");
  const createInformation = useCreateInformationMutation();
  const updateInformation = useUpdateInformationMutation(assetId ?? "");
  const deleteMutation = useDeleteAssetMutation(category);

  const asset = assetQuery.data as AnyAsset | undefined;
  const pending =
    createHardware.isPending ||
    updateHardware.isPending ||
    createSoftware.isPending ||
    updateSoftware.isPending ||
    createPeople.isPending ||
    updatePeople.isPending ||
    createPremise.isPending ||
    updatePremise.isPending ||
    createInformation.isPending ||
    updateInformation.isPending ||
    deleteMutation.isPending;

  async function handleCreate(values: Record<string, unknown>) {
    let created: AnyAsset;
    switch (category) {
      case "hardware":
        created = await createHardware.mutateAsync(values as never);
        break;
      case "software":
        created = await createSoftware.mutateAsync(values as never);
        break;
      case "people":
        created = await createPeople.mutateAsync(values as never);
        break;
      case "premise":
        created = await createPremise.mutateAsync(values as never);
        break;
      case "information":
        created = await createInformation.mutateAsync(values as never);
        break;
    }
    onCreated?.(created);
  }

  async function handleUpdate(values: Record<string, unknown>) {
    switch (category) {
      case "hardware":
        await updateHardware.mutateAsync(values as never);
        break;
      case "software":
        await updateSoftware.mutateAsync(values as never);
        break;
      case "people":
        await updatePeople.mutateAsync(values as never);
        break;
      case "premise":
        await updatePremise.mutateAsync(values as never);
        break;
      case "information":
        await updateInformation.mutateAsync(values as never);
        break;
    }
    notify.success(`${meta.singular} updated successfully`);
    onModeChange("view");
  }

  async function confirmDelete() {
    if (!assetId) return;
    await deleteMutation.mutateAsync(assetId);
    setConfirmOpen(false);
    onDeleted?.();
    onOpenChange(false);
  }

  const title =
    mode === "create"
      ? meta.createLabel
      : mode === "edit"
        ? `Edit ${meta.singular}`
        : asset
          ? assetDisplayName(asset)
          : meta.singular;

  const description =
    mode === "create"
      ? `Register a new ${meta.singular.toLowerCase()}.`
      : mode === "edit"
        ? "Update permitted fields. Business unit stays fixed."
        : asset?.reference;

  const formId =
    mode === "create" ? `asset-create-${category}` : `asset-edit-${category}`;

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        footer={
          mode === "create" ? (
            <AssetFormActions
              formId={formId}
              submitLabel="Create"
              pending={pending}
              onCancel={() => onOpenChange(false)}
            />
          ) : mode === "edit" ? (
            <AssetFormActions
              formId={formId}
              submitLabel="Save"
              pending={pending}
              onCancel={() => onModeChange("view")}
            />
          ) : asset ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={pending}
                onClick={() => setConfirmOpen(true)}
              >
                Delete
              </Button>
              <Button type="button" onClick={() => onModeChange("edit")}>
                Edit
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          )
        }
      >
      {mode === "create" ? (
        <AssetForm
          key={`create-${category}`}
          category={category}
          mode="create"
          formId={formId}
          submitLabel="Create"
          pending={pending}
          hideActions
          onSubmit={handleCreate}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}

      {mode !== "create" && assetQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading {meta.singular.toLowerCase()}…
        </div>
      ) : null}

      {mode !== "create" && assetQuery.isError ? (
        <SheetError error={assetQuery.error} label={meta.singular} />
      ) : null}

      {mode === "view" && asset ? (
        <>
          <AssetDetails category={category} asset={asset} />
          {category === "software" ? (
            <SoftwareExtras
              asset={asset as SoftwareAsset}
              editable={false}
            />
          ) : null}
        </>
      ) : null}

      {mode === "edit" && asset ? (
        <>
          <AssetForm
            key={`edit-${asset.id}`}
            category={category}
            mode="edit"
            formId={formId}
            submitLabel="Save"
            pending={pending}
            hideActions
            initialValues={toFormValues(category, asset)}
            onSubmit={handleUpdate}
            onCancel={() => onModeChange("view")}
          />
          {category === "software" ? (
            <SoftwareExtras asset={asset as SoftwareAsset} editable />
          ) : null}
        </>
      ) : null}
      </AppSheet>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${meta.singular.toLowerCase()}?`}
        description={
          asset
            ? `“${assetDisplayName(asset)}” will be removed from the inventory.`
            : `This ${meta.singular.toLowerCase()} will be removed from the inventory.`
        }
        confirmLabel="Delete"
        pending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function toFormValues(
  category: AssetCategory,
  asset: AnyAsset
): Record<string, string | number | undefined> {
  switch (category) {
    case "hardware": {
      const a = asset as import("../types").HardwareAsset;
      return {
        name: a.name,
        ownerId: a.ownerId,
        tag: a.tag,
        businessUnitId: a.businessUnitId,
        assignedDate: a.assignedDate,
        returnDate: a.returnDate,
        destructionDate: a.destructionDate,
        cost: a.cost,
      };
    }
    case "software": {
      const a = asset as SoftwareAsset;
      return {
        name: a.name,
        businessUnitId: a.businessUnitId,
        licenceCount: a.licenceCount,
        installCount: a.installCount,
        cost: a.cost,
      };
    }
    case "people": {
      const a = asset as import("../types").PeopleAsset;
      return {
        name: a.name,
        role: a.role,
        skill: a.skill,
        responsibility: a.responsibility,
        businessUnitId: a.businessUnitId,
        cost: a.cost,
      };
    }
    case "premise": {
      const a = asset as import("../types").PremiseAsset;
      return {
        name: a.name,
        location: a.location,
        address: a.address,
        businessUnitId: a.businessUnitId,
        cost: a.cost,
      };
    }
    case "information": {
      const a = asset as import("../types").InformationAsset;
      return {
        title: a.title,
        informationInventory: a.informationInventory,
        ownerId: a.ownerId,
        storageLocation: a.storageLocation,
        format: a.format,
        link: a.link,
        businessUnitId: a.businessUnitId,
        cost: a.cost,
      };
    }
  }
}

function SheetError({
  error,
  label,
}: {
  error: unknown;
  label: string;
}) {
  if (isApiClientError(error)) {
    if (error.status === 404) {
      return (
        <p className="text-sm text-muted-foreground">{label} not found.</p>
      );
    }
    if (error.status === 403) {
      return (
        <p className="text-sm text-destructive">
          You do not have permission to view this {label.toLowerCase()}.
        </p>
      );
    }
    return <p className="text-sm text-destructive">{error.message}</p>;
  }
  return (
    <p className="text-sm text-destructive">Unable to load {label.toLowerCase()}.</p>
  );
}
