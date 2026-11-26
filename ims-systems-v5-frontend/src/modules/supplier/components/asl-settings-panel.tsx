import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { CATREQ, REQ } from "../lib/asl-display";
import {
  useAslSettingsQuery,
  useUpdateAslSettingsMutation,
} from "../hooks/use-asl-supplier";
import { aslSettingsFormSchema } from "../schemas";
import type { AslCriterion } from "../types";
import { PageLoader } from "@/shared/components/ims-loader";

type AslSettingsPanelProps = {
  canEdit?: boolean;
};

export function AslSettingsPanel({ canEdit = true }: AslSettingsPanelProps) {
  const settingsQuery = useAslSettingsQuery();
  const updateMutation = useUpdateAslSettingsMutation();
  const [lead, setLead] = useState(30);
  const [follow, setFollow] = useState(7);
  const [esc, setEsc] = useState(14);
  const [from, setFrom] = useState("");
  const [intervalCritical, setIntervalCritical] = useState(6);
  const [intervalHigh, setIntervalHigh] = useState(12);
  const [intervalStandard, setIntervalStandard] = useState(24);
  const [criteria, setCriteria] = useState<AslCriterion[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = settingsQuery.data;
    if (!s) return;
    setLead(s.lead);
    setFollow(s.follow);
    setEsc(s.esc);
    setFrom(s.from);
    setIntervalCritical(s.interval.Critical);
    setIntervalHigh(s.interval.High);
    setIntervalStandard(s.interval.Standard);
    setCriteria(s.criteria.map((c) => ({ ...c })));
  }, [settingsQuery.data]);

  async function handleSave() {
    setError(null);
    const parsed = aslSettingsFormSchema.safeParse({
      lead,
      follow,
      esc,
      from,
      intervalCritical,
      intervalHigh,
      intervalStandard,
      criteria,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid settings");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        lead: parsed.data.lead,
        follow: parsed.data.follow,
        esc: parsed.data.esc,
        from: parsed.data.from,
        interval: {
          Critical: parsed.data.intervalCritical,
          High: parsed.data.intervalHigh,
          Standard: parsed.data.intervalStandard,
        },
        criteria: parsed.data.criteria,
      });
      notify.success("Settings saved");
    } catch (err) {
      notify.fromError(err, "Unable to save settings");
    }
  }

  if (settingsQuery.isLoading) {
    return (
      <PageLoader label="Loading settings…" />
    );
  }

  const weightTotal = criteria.reduce((sum, c) => sum + c.w, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <FormSection
        title="Notification timing"
        description="Lead time for ‘expiring soon’, follow-up and escalation intervals (days)."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Lead (days)">
            <input
              className="ims-field"
              type="number"
              min={1}
              value={lead}
              disabled={!canEdit}
              onChange={(e) => setLead(Number(e.target.value))}
            />
          </FormField>
          <FormField label="Follow-up (days)">
            <input
              className="ims-field"
              type="number"
              min={1}
              value={follow}
              disabled={!canEdit}
              onChange={(e) => setFollow(Number(e.target.value))}
            />
          </FormField>
          <FormField label="Escalate (days)">
            <input
              className="ims-field"
              type="number"
              min={1}
              value={esc}
              disabled={!canEdit}
              onChange={(e) => setEsc(Number(e.target.value))}
            />
          </FormField>
        </div>
        <FormField label="From address">
          <input
            className="ims-field"
            type="email"
            value={from}
            disabled={!canEdit}
            onChange={(e) => setFrom(e.target.value)}
          />
        </FormField>
      </FormSection>

      <FormSection
        title="Re-evaluation intervals"
        description="Months between evaluations by criticality."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Critical">
            <input
              className="ims-field"
              type="number"
              min={1}
              value={intervalCritical}
              disabled={!canEdit}
              onChange={(e) => setIntervalCritical(Number(e.target.value))}
            />
          </FormField>
          <FormField label="High">
            <input
              className="ims-field"
              type="number"
              min={1}
              value={intervalHigh}
              disabled={!canEdit}
              onChange={(e) => setIntervalHigh(Number(e.target.value))}
            />
          </FormField>
          <FormField label="Standard">
            <input
              className="ims-field"
              type="number"
              min={1}
              value={intervalStandard}
              disabled={!canEdit}
              onChange={(e) => setIntervalStandard(Number(e.target.value))}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection
        title="Evaluation criteria"
        description={`Weights must total 100% (currently ${weightTotal}%).`}
      >
        <div className="space-y-2">
          {criteria.map((c, index) => (
            <div key={`${c.k}-${index}`} className="flex flex-wrap gap-2">
              <input
                className="ims-field w-24"
                placeholder="Key"
                value={c.k}
                disabled={!canEdit}
                onChange={(e) => {
                  const next = [...criteria];
                  next[index] = { ...c, k: e.target.value };
                  setCriteria(next);
                }}
              />
              <input
                className="ims-field min-w-[12rem] flex-1"
                placeholder="Name"
                value={c.n}
                disabled={!canEdit}
                onChange={(e) => {
                  const next = [...criteria];
                  next[index] = { ...c, n: e.target.value };
                  setCriteria(next);
                }}
              />
              <input
                className="ims-field w-20"
                type="number"
                min={0}
                max={100}
                value={c.w}
                disabled={!canEdit}
                onChange={(e) => {
                  const next = [...criteria];
                  next[index] = { ...c, w: Number(e.target.value) };
                  setCriteria(next);
                }}
              />
              {canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={criteria.length <= 1}
                  onClick={() =>
                    setCriteria(criteria.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </div>
          ))}
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setCriteria([
                  ...criteria,
                  { k: `c${criteria.length + 1}`, n: "New criterion", w: 0 },
                ])
              }
            >
              <Plus className="size-3.5" />
              Add criterion
            </Button>
          ) : null}
        </div>
      </FormSection>

      <FormSection
        title="Required documents (reference)"
        description="Driven by criticality and category rules on the server. Display only."
      >
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="font-medium mb-2">By criticality</p>
            <ul className="space-y-2">
              {Object.entries(REQ).map(([k, docs]) => (
                <li key={k}>
                  <span className="font-medium">{k}: </span>
                  <span className="text-muted-foreground">
                    {docs.map((d) => d.replace(/\|/g, " / ")).join("; ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">By category</p>
            <ul className="space-y-2">
              {Object.entries(CATREQ).map(([k, docs]) => (
                <li key={k}>
                  <span className="font-medium">{k}: </span>
                  <span className="text-muted-foreground">
                    {docs.map((d) => d.replace(/\|/g, " / ")).join("; ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </FormSection>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {canEdit ? (
        <Button
          type="button"
          disabled={updateMutation.isPending}
          onClick={() => void handleSave()}
        >
          {updateMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : null}
          Save settings
        </Button>
      ) : null}
    </div>
  );
}
