import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/toast";
import { useUpdateIncidentResolutionTargetsMutation } from "../hooks/use-organisations";
import type { IncidentResolutionTargets } from "../types";

const PRIORITIES = ["P1", "P2", "P3", "P4"] as const;

type IncidentTargetsPanelProps = {
  targets?: IncidentResolutionTargets;
  canManage: boolean;
};

/**
 * Organisation settings for incident resolution targets (hours per
 * priority). Stats alerts trigger when average resolution time meets
 * or exceeds the target.
 */
export function IncidentResolutionTargetsPanel({
  targets,
  canManage,
}: IncidentTargetsPanelProps) {
  const mutation = useUpdateIncidentResolutionTargetsMutation();
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues(
      Object.fromEntries(
        PRIORITIES.map((p) => [p, targets?.[p] != null ? String(targets[p]) : ""]),
      ),
    );
  }, [targets]);

  async function handleSave() {
    const parsed: IncidentResolutionTargets = { P1: null, P2: null, P3: null, P4: null };
    for (const p of PRIORITIES) {
      const raw = values[p]?.trim();
      if (!raw) continue;
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) {
        notify.error(`${p} target must be a positive number of hours`);
        return;
      }
      parsed[p] = n;
    }
    try {
      await mutation.mutateAsync(parsed);
      notify.success("Incident resolution targets updated");
    } catch (error) {
      notify.fromError(error, "Unable to update incident targets");
    }
  }

  return (
    <section className="ims-panel overflow-hidden">
      <div className="ims-panel-header">
        <h3 className="text-sm font-semibold tracking-tight">
          Incident Resolution Targets
        </h3>
      </div>
      <div className="space-y-4 px-4 py-4">
        <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
          Target resolution time in hours for each incident priority. Leave a
          priority blank for no target. Dashboard statistics flag priorities
          whose average resolution time meets or exceeds the target.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PRIORITIES.map((p) => (
            <label key={p} className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {p} (hours)
              </span>
              <Input
                type="number"
                min={1}
                inputMode="numeric"
                value={values[p] ?? ""}
                disabled={!canManage}
                onChange={(e) =>
                  setValues((current) => ({ ...current, [p]: e.target.value }))
                }
                placeholder="No target"
              />
            </label>
          ))}
        </div>
        {canManage ? (
          <Button type="button" onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
            Save targets
          </Button>
        ) : null}
      </div>
    </section>
  );
}
