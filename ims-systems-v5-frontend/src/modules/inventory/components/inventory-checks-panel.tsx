import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { FileDropZone, createViewUrl } from "@/modules/files";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  decodeInventoryFileId,
  encodeInventoryFileId,
} from "../lib/file-id";
import { formatInterval } from "../lib/inventory-display";
import {
  useInventoryCalibrationLabsQuery,
  useInventoryCategoriesQuery,
  useInventorySettingsQuery,
  useRecordInventoryCheckMutation,
  useRecordInventoryEachUseMutation,
} from "../hooks/use-inventory";
import { recordCheckFormSchema } from "../schemas";
import {
  INVENTORY_CHECK_RESULTS,
  type InventoryAsset,
} from "../types";

type InventoryChecksPanelProps = {
  asset: InventoryAsset;
  canEdit?: boolean;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function openCertificate(fileId: string) {
  const decoded = decodeInventoryFileId(fileId);
  if (!decoded) {
    notify.error("Certificate reference is incomplete");
    return;
  }
  try {
    const view = await createViewUrl({
      bucket: decoded.bucket,
      key: decoded.key,
    });
    window.open(view.url, "_blank", "noopener,noreferrer");
  } catch (err) {
    notify.fromError(err, "Unable to open certificate");
  }
}

export function InventoryChecksPanel({
  asset,
  canEdit = true,
}: InventoryChecksPanelProps) {
  const categoriesQuery = useInventoryCategoriesQuery();
  const settingsQuery = useInventorySettingsQuery();
  const recordMutation = useRecordInventoryCheckMutation(asset.id);
  const eachUseMutation = useRecordInventoryEachUseMutation(asset.id);

  const defs = useMemo(() => {
    const cat = (categoriesQuery.data ?? []).find(
      (c) => c.name === asset.category
    );
    return cat?.checks ?? [];
  }, [categoriesQuery.data, asset.category]);

  const scheduled = defs.filter((d) => d.intervalMonths > 0);
  const eachUse = defs.filter((d) => d.intervalMonths === 0);

  const [checkName, setCheckName] = useState("");
  const [date, setDate] = useState(todayIso());
  const [result, setResult] =
    useState<(typeof INVENTORY_CHECK_RESULTS)[number]>("Pass");
  const [by, setBy] = useState("");
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [fileId, setFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCheck = checkName || scheduled[0]?.name || "";
  const selectedDef = defs.find((d) => d.name === selectedCheck);
  const isCalibration =
    asset.category === "Measuring & test equipment" &&
    selectedCheck === "Calibration";

  const labsQuery = useInventoryCalibrationLabsQuery(
    canEdit && isCalibration
  );

  const competentPersons = settingsQuery.data?.competentPersons ?? [];
  const competenceGated =
    Boolean(selectedDef?.requiresCompetence) && competentPersons.length > 0;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = recordCheckFormSchema.safeParse({
      checkName: selectedCheck,
      date,
      result,
      by,
      ref,
      fileId: fileId ?? "",
      note,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    try {
      const saved = await recordMutation.mutateAsync({
        checkName: parsed.data.checkName,
        date: parsed.data.date,
        result: parsed.data.result,
        by: parsed.data.by,
        ref: parsed.data.ref || "",
        fileId: parsed.data.fileId || null,
        note: parsed.data.note || "",
      });
      if (saved.incidentId) {
        notify.success("Check saved — NCR raised in Incidents");
      } else {
        notify.success("Check result saved");
      }
      setBy("");
      setRef("");
      setNote("");
      setFileId(null);
      setResult("Pass");
      setDate(todayIso());
    } catch (err) {
      notify.fromError(err, "Unable to save check result");
    }
  }

  async function handleEachUse(name: string) {
    try {
      await eachUseMutation.mutateAsync({ checkName: name });
      notify.success(`Each-use recorded: ${name}`);
    } catch (err) {
      notify.fromError(err, "Unable to record each-use");
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {defs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No checks defined for this category.
          </p>
        ) : (
          defs.map((def) => {
            const last = asset.checks[def.name];
            return (
              <div
                key={def.name}
                className="rounded-lg border border-border-subtle px-3 py-2.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{def.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatInterval(def.intervalMonths)} · {def.basis}
                      {def.requiresCompetence ? " · competence required" : ""}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {last
                        ? `Last: ${last.date} · ${last.result} · ${last.by}${
                            last.ref ? ` · ${last.ref}` : ""
                          }`
                        : "Never recorded"}
                    </div>
                    {last?.fileId ? (
                      <button
                        type="button"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
                        onClick={() => void openCertificate(last.fileId!)}
                      >
                        <FileText className="size-3.5" />
                        View certificate
                      </button>
                    ) : null}
                  </div>
                  {canEdit && def.intervalMonths === 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={eachUseMutation.isPending}
                      onClick={() => void handleEachUse(def.name)}
                    >
                      Record use
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {canEdit && scheduled.length > 0 ? (
        <form
          className="space-y-3 rounded-xl border border-border-subtle p-3"
          onSubmit={(e) => void handleSave(e)}
        >
          <div className="text-sm font-semibold">Record a result</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Check" required>
              <select
                className="ims-select ims-field"
                value={selectedCheck}
                disabled={recordMutation.isPending}
                onChange={(e) => setCheckName(e.target.value)}
              >
                {scheduled.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Date" required>
              <input
                type="date"
                className="ims-field"
                value={date}
                disabled={recordMutation.isPending}
                onChange={(e) => setDate(e.target.value)}
              />
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Result" required>
              <select
                className="ims-select ims-field"
                value={result}
                disabled={recordMutation.isPending}
                onChange={(e) =>
                  setResult(
                    e.target.value as (typeof INVENTORY_CHECK_RESULTS)[number]
                  )
                }
              >
                {INVENTORY_CHECK_RESULTS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="By (competent person / lab)" required>
              <div className="space-y-2">
                {isCalibration && (labsQuery.data?.length ?? 0) > 0 ? (
                  <select
                    className="ims-select ims-field"
                    disabled={recordMutation.isPending || labsQuery.isLoading}
                    value={
                      (labsQuery.data ?? []).some((l) => l.name === by)
                        ? by
                        : ""
                    }
                    onChange={(e) => setBy(e.target.value)}
                  >
                    <option value="">
                      {labsQuery.isLoading
                        ? "Loading UKAS labs…"
                        : "Select UKAS calibration lab"}
                    </option>
                    {(labsQuery.data ?? []).map((lab) => (
                      <option key={lab.id} value={lab.name}>
                        {lab.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                {competenceGated ? (
                  <select
                    className="ims-select ims-field"
                    disabled={recordMutation.isPending}
                    value={by}
                    onChange={(e) => setBy(e.target.value)}
                  >
                    <option value="">Select competent person</option>
                    {competentPersons.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="ims-field"
                    value={by}
                    disabled={recordMutation.isPending}
                    placeholder="e.g. Calderdale Calibration"
                    onChange={(e) => setBy(e.target.value)}
                  />
                )}
              </div>
            </FormField>
          </div>
          {isCalibration && labsQuery.isLoading ? (
            <p className="text-xs text-muted-foreground">
              Loading ASL calibration labs…
            </p>
          ) : null}
          {competenceGated ? (
            <p className="text-xs text-muted-foreground">
              This check requires a person from the competent persons list in
              Settings.
            </p>
          ) : null}
          <FormField label="Certificate / report reference">
            <input
              className="ims-field"
              value={ref}
              disabled={recordMutation.isPending}
              onChange={(e) => setRef(e.target.value)}
            />
          </FormField>
          <FormField label="Certificate file (optional)">
            <FileDropZone
              path="inventory"
              multiple={false}
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              disabled={recordMutation.isPending}
              onUploaded={(meta) => setFileId(encodeInventoryFileId(meta))}
              onRemoved={() => setFileId(null)}
            />
            {fileId ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Certificate attached for this result.
              </p>
            ) : null}
          </FormField>
          <FormField label="Notes">
            <input
              className="ims-field"
              value={note}
              disabled={recordMutation.isPending}
              onChange={(e) => setNote(e.target.value)}
            />
          </FormField>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <p className="text-xs text-muted-foreground">
            Next due is set from the interval. A Fail quarantines the asset and
            raises an NCR.
            {eachUse.length
              ? " Each-use checks use the Record use button above."
              : ""}
          </p>
          <Button type="submit" disabled={recordMutation.isPending}>
            Save result
          </Button>
        </form>
      ) : null}
    </div>
  );
}
