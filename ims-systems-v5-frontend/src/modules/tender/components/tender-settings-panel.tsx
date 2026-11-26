import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  useTenderSettingsQuery,
  useUpdateTenderSettingsMutation,
} from "../hooks/use-tender";
import { PageLoader } from "@/shared/components/ims-loader";

type TenderSettingsPanelProps = {
  canEdit?: boolean;
};

export function TenderSettingsPanel({
  canEdit = true,
}: TenderSettingsPanelProps) {
  const settingsQuery = useTenderSettingsQuery();
  const updateMutation = useUpdateTenderSettingsMutation();

  const [reviewMonths, setReviewMonths] = useState(12);
  const [approversText, setApproversText] = useState("");
  const [tone, setTone] = useState("");
  const [minConfidence, setMinConfidence] = useState(0.55);
  const [certWarnDays, setCertWarnDays] = useState(60);
  const [learn, setLearn] = useState(true);
  const [submissionCc, setSubmissionCc] = useState("");
  const [fromEmail, setFromEmail] = useState("");

  useEffect(() => {
    const s = settingsQuery.data;
    if (!s) return;
    setReviewMonths(s.reviewMonths);
    setApproversText((s.approvers ?? []).join("\n"));
    setTone(s.tone ?? "");
    setMinConfidence(s.minConfidence);
    setCertWarnDays(s.certWarnDays);
    setLearn(s.learn);
    setSubmissionCc(s.submissionCc ?? "");
    setFromEmail(s.fromEmail ?? "");
  }, [settingsQuery.data]);

  if (settingsQuery.isLoading) {
    return (
      <PageLoader label="Loading settings…" />
    );
  }

  if (!settingsQuery.data) {
    return (
      <EmptyState
        title="Settings unavailable"
        description="Could not load tender settings."
      />
    );
  }

  async function handleSave() {
    try {
      const approvers = approversText
        .split(/\n|,/)
        .map((s) => s.trim())
        .filter(Boolean);
      await updateMutation.mutateAsync({
        reviewMonths,
        approvers,
        tone,
        minConfidence,
        certWarnDays,
        learn,
        submissionCc,
        fromEmail,
      });
      notify.success("Settings saved");
    } catch (error) {
      notify.fromError(error, "Unable to save settings");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Drafting tone, approval rules, certificate warnings and submission
          mail defaults.
        </p>
      </div>

      <FormSection title="Drafting">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Library review months">
            <input
              type="number"
              min={1}
              max={120}
              className="ims-field"
              value={reviewMonths}
              disabled={!canEdit || updateMutation.isPending}
              onChange={(e) => setReviewMonths(Number(e.target.value) || 12)}
            />
          </FormField>
          <FormField label="Min confidence (0–1)">
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              className="ims-field"
              value={minConfidence}
              disabled={!canEdit || updateMutation.isPending}
              onChange={(e) =>
                setMinConfidence(Number(e.target.value) || 0.55)
              }
            />
          </FormField>
        </div>
        <FormField label="Tone">
          <textarea
            className="ims-field min-h-[100px]"
            value={tone}
            disabled={!canEdit || updateMutation.isPending}
            onChange={(e) => setTone(e.target.value)}
          />
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={learn}
            disabled={!canEdit || updateMutation.isPending}
            onChange={(e) => setLearn(e.target.checked)}
          />
          Learn accepted answers into the library
        </label>
      </FormSection>

      <FormSection title="Approvers & evidence">
        <FormField label="Approvers (one email per line)">
          <textarea
            className="ims-field min-h-[80px]"
            value={approversText}
            disabled={!canEdit || updateMutation.isPending}
            placeholder={"approver@example.com"}
            onChange={(e) => setApproversText(e.target.value)}
          />
        </FormField>
        <FormField label="Certificate warn days">
          <input
            type="number"
            min={1}
            max={365}
            className="ims-field max-w-[12rem]"
            value={certWarnDays}
            disabled={!canEdit || updateMutation.isPending}
            onChange={(e) => setCertWarnDays(Number(e.target.value) || 60)}
          />
        </FormField>
      </FormSection>

      <FormSection title="Submission email">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="From email">
            <input
              className="ims-field"
              value={fromEmail}
              disabled={!canEdit || updateMutation.isPending}
              onChange={(e) => setFromEmail(e.target.value)}
            />
          </FormField>
          <FormField label="Submission CC">
            <input
              className="ims-field"
              value={submissionCc}
              disabled={!canEdit || updateMutation.isPending}
              onChange={(e) => setSubmissionCc(e.target.value)}
            />
          </FormField>
        </div>
      </FormSection>

      {canEdit ? (
        <Button
          type="button"
          disabled={updateMutation.isPending}
          onClick={() => void handleSave()}
        >
          {updateMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          Save settings
        </Button>
      ) : null}
    </div>
  );
}
