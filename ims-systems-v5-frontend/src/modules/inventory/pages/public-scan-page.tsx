import { useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  getStoredScanName,
  setStoredScanName,
} from "../api/inventory";
import {
  usePublicScanActionMutation,
  usePublicScanQuery,
} from "../hooks/use-inventory";
import { InventoryDueBadge, InventoryStageBadge } from "../components/inventory-badges";
import { INVENTORY_CHECK_RESULTS } from "../types";
import { PageLoader } from "@/shared/components/ims-loader";

/**
 * Public mobile scan card — `/inventory/scan/:organizationId/:tag`.
 */
export function PublicInventoryScanPage() {
  const { organizationId = "", tag = "" } = useParams();
  const scanQuery = usePublicScanQuery(organizationId, tag);
  const actionMutation = usePublicScanActionMutation(organizationId, tag);

  const [scanName, setScanName] = useState(getStoredScanName());
  const [faultNote, setFaultNote] = useState("");
  const [location, setLocation] = useState("");
  const [checkName, setCheckName] = useState("");
  const [checkDate, setCheckDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [checkResult, setCheckResult] =
    useState<(typeof INVENTORY_CHECK_RESULTS)[number]>("Pass");
  const [checkBy, setCheckBy] = useState("");

  const snap = scanQuery.data;

  function ensureName(): string | null {
    const name = scanName.trim();
    if (!name && snap?.requireLoginForScanActions === false) {
      notify.error("Enter your name to take actions");
      return null;
    }
    if (name) setStoredScanName(name);
    return name || "User";
  }

  async function run(
    action: "fault" | "each-use" | "move" | "sighting" | "checks",
    body: Record<string, unknown>
  ) {
    const name = ensureName();
    if (!name && !snap?.requireLoginForScanActions) return;
    try {
      await actionMutation.mutateAsync({
        action,
        body,
        scanName: name ?? "",
      });
      notify.success("Saved");
    } catch (error) {
      notify.fromError(error, "Action failed");
    }
  }

  if (scanQuery.isLoading) {
    return (
      <PageLoader label="Loading asset…" fullScreen />
    );
  }

  if (!snap) {
    return (
      <div className="mx-auto max-w-md p-6">
        <EmptyState
          title="Asset not found"
          description="This tag is not on the register, or it has been disposed."
        />
      </div>
    );
  }

  const eachUseChecks = snap.checks.filter((c) => c.intervalMonths === 0);
  const scheduledChecks = snap.checks.filter((c) => c.intervalMonths > 0);

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-background p-4 pb-10">
      <div className="mb-4 text-center">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          iMS · Inventory scan
        </div>
        <h1 className="mt-1 font-mono text-xl font-bold">{snap.tag}</h1>
        <p className="text-sm">{snap.name}</p>
      </div>

      <div
        className={`mb-4 rounded-xl border p-4 text-center ${
          snap.okToUse
            ? "border-emerald-500/40 bg-emerald-500/10"
            : "border-destructive/40 bg-destructive/10"
        }`}
      >
        <div className="text-lg font-semibold">
          {snap.okToUse ? "OK to use" : "Do not use"}
        </div>
        <div className="mt-2 flex justify-center gap-2">
          <InventoryStageBadge stage={snap.stage} />
        </div>
      </div>

      <div className="mb-4 space-y-2 rounded-xl border border-border-subtle p-3 text-sm">
        <div>
          <span className="text-muted-foreground">Location: </span>
          {snap.location || "—"}
        </div>
        <div>
          <span className="text-muted-foreground">Custodian: </span>
          {snap.custodian || "—"}
        </div>
        {snap.safetyNotes ? (
          <div>
            <span className="text-muted-foreground">Safety notes: </span>
            {snap.safetyNotes}
          </div>
        ) : null}
        {snap.lastActivity ? (
          <div className="text-xs text-muted-foreground">
            Last: {snap.lastActivity.what} · {snap.lastActivity.by}
          </div>
        ) : null}
      </div>

      <div className="mb-4 space-y-2">
        <div className="text-sm font-semibold">Checks</div>
        {snap.checks.map((c) => (
          <div
            key={c.name}
            className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-2 text-sm"
          >
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-muted-foreground">
                Next {c.nextDue ?? "—"}
              </div>
            </div>
            <InventoryDueBadge state={c.state} />
          </div>
        ))}
      </div>

      <FormField label="Your name (saved on this device)">
        <input
          className="ims-field"
          value={scanName}
          placeholder="Required for actions"
          onChange={(e) => setScanName(e.target.value)}
        />
      </FormField>
      {snap.requireLoginForScanActions ? (
        <p className="mb-3 text-xs text-amber-700">
          This organisation requires login for scan actions.
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-border-subtle p-3">
          <div className="mb-2 text-sm font-semibold">Report fault</div>
          <input
            className="ims-field mb-2"
            value={faultNote}
            placeholder="Describe the fault"
            onChange={(e) => setFaultNote(e.target.value)}
          />
          <Button
            type="button"
            className="w-full"
            disabled={actionMutation.isPending}
            onClick={() => void run("fault", { note: faultNote })}
          >
            Submit fault
          </Button>
        </div>

        <div className="rounded-xl border border-border-subtle p-3">
          <div className="mb-2 text-sm font-semibold">Move location</div>
          <input
            className="ims-field mb-2"
            value={location}
            placeholder="Site · area"
            onChange={(e) => setLocation(e.target.value)}
          />
          <Button
            type="button"
            className="w-full"
            variant="outline"
            disabled={actionMutation.isPending}
            onClick={() => void run("move", { location })}
          >
            Save location
          </Button>
        </div>

        <Button
          type="button"
          className="w-full"
          variant="outline"
          disabled={actionMutation.isPending}
          onClick={() => void run("sighting", { note: "" })}
        >
          Confirm sighting
        </Button>

        {eachUseChecks.map((c) => (
          <Button
            key={c.name}
            type="button"
            className="w-full"
            variant="outline"
            disabled={actionMutation.isPending}
            onClick={() => void run("each-use", { checkName: c.name })}
          >
            Record each-use: {c.name}
          </Button>
        ))}

        {scheduledChecks.length ? (
          <div className="space-y-2 rounded-xl border border-border-subtle p-3">
            <div className="text-sm font-semibold">Record result</div>
            <select
              className="ims-select ims-field"
              value={checkName || scheduledChecks[0]?.name}
              onChange={(e) => setCheckName(e.target.value)}
            >
              {scheduledChecks.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="ims-field"
              value={checkDate}
              onChange={(e) => setCheckDate(e.target.value)}
            />
            <select
              className="ims-select ims-field"
              value={checkResult}
              onChange={(e) =>
                setCheckResult(
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
            <input
              className="ims-field"
              value={checkBy}
              placeholder="Competent person / lab"
              onChange={(e) => setCheckBy(e.target.value)}
            />
            <Button
              type="button"
              className="w-full"
              disabled={actionMutation.isPending}
              onClick={() =>
                void run("checks", {
                  checkName: checkName || scheduledChecks[0]?.name,
                  date: checkDate,
                  result: checkResult,
                  by: checkBy || scanName,
                })
              }
            >
              Save result
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
