import { useEffect, useState } from "react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { useMoveInventoryStageMutation } from "../hooks/use-inventory";
import { moveStageFormSchema } from "../schemas";
import {
  INVENTORY_DISPOSAL_ROUTES,
  type InventoryAsset,
  type InventoryStage,
} from "../types";
import { InventoryStageBadge } from "./inventory-badges";

type InventoryLifecyclePanelProps = {
  asset: InventoryAsset;
  canEdit?: boolean;
};

const ALLOWED: Record<InventoryStage, InventoryStage[]> = {
  Requested: ["Procured", "Retired"],
  Procured: ["Commissioned", "Retired"],
  Commissioned: ["In service", "Retired"],
  "In service": ["Under maintenance", "Quarantined", "Retired"],
  "Under maintenance": ["In service", "Quarantined", "Retired"],
  Quarantined: ["In service", "Under maintenance", "Retired"],
  Retired: ["Disposed", "In service"],
  Disposed: [],
};

export function InventoryLifecyclePanel({
  asset,
  canEdit = true,
}: InventoryLifecyclePanelProps) {
  const moveMutation = useMoveInventoryStageMutation(asset.id);
  const stageOptions = ALLOWED[asset.stage] ?? [];

  const [stage, setStage] = useState<InventoryStage | "">(
    stageOptions[0] ?? ""
  );
  const [reason, setReason] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [route, setRoute] = useState("");
  const [evidence, setEvidence] = useState("");
  const [wipeCert, setWipeCert] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStage(ALLOWED[asset.stage]?.[0] ?? "");
  }, [asset.stage, asset.id]);

  const needsDisposalFields = stage === "Retired" || stage === "Disposed";
  const needsRoute = stage === "Disposed";

  async function handleMove(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!stage) {
      setError("Select a stage");
      return;
    }
    const parsed = moveStageFormSchema.safeParse({
      stage,
      reason,
      approvedBy,
      route,
      evidence,
      wipeCert,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    try {
      await moveMutation.mutateAsync({
        stage: parsed.data.stage,
        reason: parsed.data.reason || "",
        approvedBy: parsed.data.approvedBy || "",
        route: parsed.data.route || "",
        evidence: parsed.data.evidence || "",
        wipeCert: parsed.data.wipeCert || "",
      });
      notify.success(`Moved to ${parsed.data.stage}`);
      setReason("");
      setApprovedBy("");
      setRoute("");
      setEvidence("");
      setWipeCert("");
    } catch (err) {
      notify.fromError(err, "Unable to move stage");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Current stage</span>
        <InventoryStageBadge stage={asset.stage} />
      </div>
      <p className="text-xs text-muted-foreground">
        Requested → Procured → Commissioned → In service ⇄ (Under maintenance /
        Quarantined) → Retired → Disposed. Each move is logged.
      </p>

      {asset.disposal ? (
        <div className="rounded-lg border border-border-subtle bg-muted/30 px-3 py-2 text-sm">
          <div className="font-medium">Retirement / disposal record</div>
          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            <div>Date: {asset.disposal.date}</div>
            <div>Reason: {asset.disposal.reason}</div>
            {asset.disposal.route ? (
              <div>Route: {asset.disposal.route}</div>
            ) : null}
            {asset.disposal.evidence ? (
              <div>Evidence: {asset.disposal.evidence}</div>
            ) : null}
            {asset.disposal.wipeCert ? (
              <div>Wipe cert: {asset.disposal.wipeCert}</div>
            ) : null}
            <div>Approved by: {asset.disposal.approvedBy}</div>
          </div>
        </div>
      ) : null}

      {canEdit && stageOptions.length > 0 ? (
        <form
          className="space-y-3 rounded-xl border border-border-subtle p-3"
          onSubmit={(e) => void handleMove(e)}
        >
          <FormField label="Move to stage" required>
            <select
              className="ims-select ims-field"
              value={stage}
              disabled={moveMutation.isPending}
              onChange={(e) =>
                setStage(e.target.value as InventoryStage | "")
              }
            >
              {stageOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FormField>

          {needsDisposalFields ? (
            <>
              <FormField label="Reason" required>
                <input
                  className="ims-field"
                  value={reason}
                  disabled={moveMutation.isPending}
                  placeholder="e.g. Replaced; beyond economic repair"
                  onChange={(e) => setReason(e.target.value)}
                />
              </FormField>
              <FormField label="Approved by" required>
                <input
                  className="ims-field"
                  value={approvedBy}
                  disabled={moveMutation.isPending}
                  placeholder="Name and role"
                  onChange={(e) => setApprovedBy(e.target.value)}
                />
              </FormField>
            </>
          ) : (
            <FormField label="Reason (optional)">
              <input
                className="ims-field"
                value={reason}
                disabled={moveMutation.isPending}
                onChange={(e) => setReason(e.target.value)}
              />
            </FormField>
          )}

          {needsRoute ? (
            <>
              <FormField label="Disposal route" required>
                <select
                  className="ims-select ims-field"
                  value={route}
                  disabled={moveMutation.isPending}
                  onChange={(e) => setRoute(e.target.value)}
                >
                  <option value="">Select route…</option>
                  {INVENTORY_DISPOSAL_ROUTES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Evidence" required>
                <input
                  className="ims-field"
                  value={evidence}
                  disabled={moveMutation.isPending}
                  placeholder="Waste transfer note / certificate ref"
                  onChange={(e) => setEvidence(e.target.value)}
                />
              </FormField>
              {asset.informationAsset ? (
                <FormField
                  label="Data-wipe / destruction certificate"
                  required
                >
                  <input
                    className="ims-field"
                    value={wipeCert}
                    disabled={moveMutation.isPending}
                    onChange={(e) => setWipeCert(e.target.value)}
                  />
                </FormField>
              ) : null}
            </>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={moveMutation.isPending || !stage}>
            Move stage
          </Button>
        </form>
      ) : canEdit ? (
        <p className="text-sm text-muted-foreground">
          No further stage moves are available from {asset.stage}.
        </p>
      ) : null}
    </div>
  );
}
