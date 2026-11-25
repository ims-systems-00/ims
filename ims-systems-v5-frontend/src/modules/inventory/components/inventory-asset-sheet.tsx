import { useEffect, useMemo, useState } from "react";
import { Eye, Loader2, MapPin, Pencil, Sparkles, Wrench } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { SheetPanelTabs } from "@/modules/activities";
import {
  AnalyticalAssistantSheet,
  buildInventoryAssistantContext,
} from "@/modules/ai";
import { useCurrentOrganisationQuery } from "@/modules/organisation";
import { notify } from "@/shared/lib/toast";
import { formatWhen } from "../lib/inventory-display";
import {
  useConfirmInventorySightingMutation,
  useCreateInventoryAssetMutation,
  useInventoryAssetQuery,
  useInventoryCategoriesQuery,
  useMoveInventoryLocationMutation,
  useReportInventoryFaultMutation,
  useUpdateInventoryAssetMutation,
} from "../hooks/use-inventory";
import type {
  CreateInventoryAssetInput,
  UpdateInventoryAssetInput,
} from "../types";
import { InventoryAssetForm } from "./inventory-asset-form";
import {
  InventoryCritBadge,
  InventoryDueBadge,
  InventoryStageBadge,
} from "./inventory-badges";
import { InventoryChecksPanel } from "./inventory-checks-panel";
import { InventoryLifecyclePanel } from "./inventory-lifecycle-panel";

export type InventoryAssetSheetMode = "create" | "view" | "edit";

type InventoryAssetSheetProps = {
  open: boolean;
  mode: InventoryAssetSheetMode;
  assetId?: string | null;
  initialTab?: string;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: InventoryAssetSheetMode) => void;
  canCreate?: boolean;
};

const SHEET_TABS = [
  { id: "details", label: "Details" },
  { id: "checks", label: "Checks" },
  { id: "history", label: "History" },
  { id: "lifecycle", label: "Lifecycle" },
];

export function InventoryAssetSheet({
  open,
  mode,
  assetId,
  initialTab = "details",
  onOpenChange,
  onModeChange,
  canCreate = true,
}: InventoryAssetSheetProps) {
  const [panelTab, setPanelTab] = useState(initialTab);
  const [faultNote, setFaultNote] = useState("");
  const [faultOpen, setFaultOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveLocation, setMoveLocation] = useState("");
  const [sightOpen, setSightOpen] = useState(false);
  const [sightNote, setSightNote] = useState("");
  const [aliceOpen, setAliceOpen] = useState(false);

  useEffect(() => {
    if (open) setPanelTab(initialTab || "details");
  }, [open, assetId, initialTab]);

  useEffect(() => {
    if (!open) setAliceOpen(false);
  }, [open]);

  const assetQuery = useInventoryAssetQuery(
    mode === "create" ? undefined : (assetId ?? undefined)
  );
  const categoriesQuery = useInventoryCategoriesQuery();
  const orgQuery = useCurrentOrganisationQuery();
  const createMutation = useCreateInventoryAssetMutation();
  const updateMutation = useUpdateInventoryAssetMutation(assetId ?? "");
  const faultMutation = useReportInventoryFaultMutation(assetId ?? "");
  const moveMutation = useMoveInventoryLocationMutation(assetId ?? "");
  const sightMutation = useConfirmInventorySightingMutation(assetId ?? "");

  const asset = assetQuery.data;
  const categories = categoriesQuery.data ?? [];
  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    faultMutation.isPending ||
    moveMutation.isPending ||
    sightMutation.isPending;

  async function handleCreate(
    values: CreateInventoryAssetInput | UpdateInventoryAssetInput
  ) {
    try {
      await createMutation.mutateAsync(values as CreateInventoryAssetInput);
      notify.success("Asset created");
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to create asset");
    }
  }

  async function handleUpdate(
    values: CreateInventoryAssetInput | UpdateInventoryAssetInput
  ) {
    try {
      await updateMutation.mutateAsync(values as UpdateInventoryAssetInput);
      notify.success("Asset updated");
      onModeChange("view");
    } catch (error) {
      notify.fromError(error, "Unable to update asset");
    }
  }

  async function handleFault() {
    if (!faultNote.trim()) {
      notify.error("Fault note is required");
      return;
    }
    try {
      const saved = await faultMutation.mutateAsync({ note: faultNote.trim() });
      if (saved.incidentId) {
        notify.success("Fault reported — NCR raised in Incidents");
      } else {
        notify.success("Fault reported — asset under maintenance");
      }
      setFaultNote("");
      setFaultOpen(false);
    } catch (error) {
      notify.fromError(error, "Unable to report fault");
    }
  }

  const aliceContext = useMemo(() => {
    if (!asset) return null;
    return buildInventoryAssistantContext(
      asset,
      orgQuery.data?.name ?? "Organisation"
    );
  }, [asset, orgQuery.data?.name]);

  async function handleMove() {
    if (!moveLocation.trim()) {
      notify.error("Location is required");
      return;
    }
    try {
      await moveMutation.mutateAsync({ location: moveLocation.trim() });
      notify.success("Location updated");
      setMoveOpen(false);
    } catch (error) {
      notify.fromError(error, "Unable to move location");
    }
  }

  async function handleSighting() {
    try {
      await sightMutation.mutateAsync({ note: sightNote.trim() });
      notify.success("Sighting confirmed");
      setSightNote("");
      setSightOpen(false);
    } catch (error) {
      notify.fromError(error, "Unable to confirm sighting");
    }
  }

  const title =
    mode === "create"
      ? "Add asset"
      : asset
        ? `${asset.tag} · ${asset.name}`
        : "Asset";

  return (
    <>
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={
        mode === "create"
          ? "Register a new asset with its category controls."
          : asset?.category
      }
      className="sm:max-w-xl"
    >
      {mode !== "create" && assetQuery.isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading asset…
        </div>
      ) : null}

      {mode === "create" ? (
        <InventoryAssetForm
          mode="create"
          categories={categories}
          pending={pending}
          onSubmit={handleCreate}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}

      {mode !== "create" && asset ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <InventoryStageBadge stage={asset.stage} />
            <InventoryCritBadge crit={asset.criticality} />
            <InventoryDueBadge state={asset.nextDueState} />
            {asset.okToUse === false ? (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                Do not use
              </span>
            ) : asset.okToUse ? (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                OK to use
              </span>
            ) : null}
            <div className="ml-auto flex flex-wrap gap-2">
              {mode === "view" && aliceContext ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAliceOpen(true)}
                >
                  <Sparkles className="size-3.5" /> Alice
                </Button>
              ) : null}
              {canCreate && mode === "view" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onModeChange("edit")}
                >
                  <Pencil className="size-3.5" /> Edit
                </Button>
              ) : null}
              {canCreate && asset.stage !== "Disposed" ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMoveLocation(asset.location);
                      setMoveOpen((v) => !v);
                      setFaultOpen(false);
                      setSightOpen(false);
                    }}
                  >
                    <MapPin className="size-3.5" /> Move
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSightOpen((v) => !v);
                      setFaultOpen(false);
                      setMoveOpen(false);
                    }}
                  >
                    <Eye className="size-3.5" /> Sighting
                  </Button>
                </>
              ) : null}
              {canCreate &&
              asset.stage !== "Disposed" &&
              asset.stage !== "Retired" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFaultOpen((v) => !v);
                    setMoveOpen(false);
                    setSightOpen(false);
                  }}
                >
                  <Wrench className="size-3.5" /> Report fault
                </Button>
              ) : null}
            </div>
          </div>

          {faultOpen ? (
            <div className="space-y-2 rounded-lg border border-border-subtle p-3">
              <FormField label="Fault note" required>
                <input
                  className="ims-field"
                  value={faultNote}
                  disabled={pending}
                  placeholder="Describe the fault"
                  onChange={(e) => setFaultNote(e.target.value)}
                />
              </FormField>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => void handleFault()}
                >
                  Submit fault
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setFaultOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {moveOpen ? (
            <div className="space-y-2 rounded-lg border border-border-subtle p-3">
              <FormField label="New location" required>
                <input
                  className="ims-field"
                  value={moveLocation}
                  disabled={pending}
                  placeholder="Site · area"
                  onChange={(e) => setMoveLocation(e.target.value)}
                />
              </FormField>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => void handleMove()}
                >
                  Save location
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setMoveOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {sightOpen ? (
            <div className="space-y-2 rounded-lg border border-border-subtle p-3">
              <FormField label="Sighting note (optional)">
                <input
                  className="ims-field"
                  value={sightNote}
                  disabled={pending}
                  onChange={(e) => setSightNote(e.target.value)}
                />
              </FormField>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => void handleSighting()}
                >
                  Confirm sighting
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSightOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {mode === "edit" ? (
            <InventoryAssetForm
              mode="edit"
              initial={asset}
              categories={categories}
              pending={pending}
              onSubmit={handleUpdate}
              onCancel={() => onModeChange("view")}
            />
          ) : (
            <>
              <SheetPanelTabs
                tabs={SHEET_TABS}
                value={panelTab}
                onChange={setPanelTab}
              />

              {panelTab === "details" ? (
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <Detail label="Tag" value={asset.tag} mono />
                  <Detail label="Category" value={asset.category} />
                  <Detail label="Location" value={asset.location || "—"} />
                  <Detail label="Custodian" value={asset.custodian || "—"} />
                  <Detail label="Make / model" value={asset.makeModel || "—"} />
                  <Detail label="Serial" value={asset.serial || "—"} />
                  <Detail
                    label="Purchase date"
                    value={asset.purchaseDate || "—"}
                  />
                  <Detail
                    label="Cost"
                    value={
                      asset.cost != null ? String(asset.cost) : "—"
                    }
                  />
                  <Detail label="Supplier" value={asset.supplier || "—"} />
                  <Detail
                    label="Warranty ends"
                    value={asset.warrantyEnds || "—"}
                  />
                  <Detail
                    label="Information asset"
                    value={asset.informationAsset ? "Yes" : "No"}
                  />
                  <Detail
                    label="Label printed"
                    value={asset.labelPrinted ? "Yes" : "No"}
                  />
                  <div className="sm:col-span-2">
                    <Detail
                      label="Safety notes"
                      value={asset.safetyNotes || "—"}
                    />
                  </div>
                  {asset.issues && asset.issues.length > 0 ? (
                    <div className="sm:col-span-2 space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">
                        Issues
                      </div>
                      <ul className="list-inside list-disc text-sm text-destructive">
                        {asset.issues.map((i) => (
                          <li key={`${i.code}-${i.message}`}>{i.message}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {panelTab === "checks" ? (
                <InventoryChecksPanel asset={asset} canEdit={canCreate} />
              ) : null}

              {panelTab === "history" ? (
                <div className="space-y-2">
                  {asset.history.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No history yet.
                    </p>
                  ) : (
                    asset.history.map((h, idx) => (
                      <div
                        key={`${h.t}-${idx}`}
                        className="rounded-lg border border-border-subtle px-3 py-2 text-sm"
                      >
                        <div className="text-xs text-muted-foreground">
                          {formatWhen(h.t)} · {h.by}
                        </div>
                        <div>{h.what}</div>
                      </div>
                    ))
                  )}
                </div>
              ) : null}

              {panelTab === "lifecycle" ? (
                <InventoryLifecyclePanel asset={asset} canEdit={canCreate} />
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </AppSheet>

    {aliceContext ? (
      <AnalyticalAssistantSheet
        open={aliceOpen}
        onOpenChange={setAliceOpen}
        context={aliceContext}
      />
    ) : null}
    </>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-sm" : "text-sm"}>{value}</div>
    </div>
  );
}
