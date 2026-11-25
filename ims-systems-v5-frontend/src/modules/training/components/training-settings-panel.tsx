import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { ensureTrainingCatalogue } from "../api/training";
import {
  useTrainingSettingsQuery,
  useUpdateTrainingSettingsMutation,
} from "../hooks/use-training";
import { settingsFormSchema } from "../schemas";

type TrainingSettingsPanelProps = {
  canEdit?: boolean;
};

export function TrainingSettingsPanel({
  canEdit = true,
}: TrainingSettingsPanelProps) {
  const settingsQuery = useTrainingSettingsQuery();
  const updateMutation = useUpdateTrainingSettingsMutation();
  const [bootstrapping, setBootstrapping] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [leadDays, setLeadDays] = useState(60);
  const [inductionDays, setInductionDays] = useState(14);
  const [siteLabel, setSiteLabel] = useState("Site");
  const [sitesText, setSitesText] = useState("");
  const [providersText, setProvidersText] = useState("");
  const [allowSelfUpload, setAllowSelfUpload] = useState(true);
  const [requireVerification, setRequireVerification] = useState(true);
  const [selfTokenDays, setSelfTokenDays] = useState(90);
  const [reminderDaysText, setReminderDaysText] = useState("14, 1");
  const [inviteSubject, setInviteSubject] = useState("");
  const [inviteBody, setInviteBody] = useState("");
  const [organiserEmail, setOrganiserEmail] = useState("");

  useEffect(() => {
    const s = settingsQuery.data;
    if (!s) return;
    setOrgName(s.orgName ?? "");
    setLeadDays(s.leadDays);
    setInductionDays(s.inductionDays);
    setSiteLabel(s.siteLabel ?? "Site");
    setSitesText((s.sites ?? []).join("\n"));
    setProvidersText((s.providers ?? []).join("\n"));
    setAllowSelfUpload(s.allowSelfUpload);
    setRequireVerification(s.requireVerification);
    setSelfTokenDays(s.selfTokenDays);
    setReminderDaysText((s.reminderDays ?? []).join(", "));
    setInviteSubject(s.inviteSubject ?? "");
    setInviteBody(s.inviteBody ?? "");
    setOrganiserEmail(s.organiserEmail ?? "");
  }, [settingsQuery.data]);

  if (settingsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading settings…
      </div>
    );
  }

  if (!settingsQuery.data) {
    return (
      <EmptyState
        title="Settings unavailable"
        description="Could not load training settings."
      />
    );
  }

  async function handleSave() {
    const parsed = settingsFormSchema.safeParse({
      orgName,
      leadDays,
      inductionDays,
      siteLabel,
      sitesText,
      providersText,
      allowSelfUpload,
      requireVerification,
      selfTokenDays,
      reminderDaysText,
      inviteSubject,
      inviteBody,
      organiserEmail,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    const sites = (parsed.data.sitesText || "")
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
    const providers = (parsed.data.providersText || "")
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
    const reminderDays = (parsed.data.reminderDaysText || "")
      .split(/,|\s+/)
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
    try {
      await updateMutation.mutateAsync({
        orgName: parsed.data.orgName || undefined,
        leadDays: parsed.data.leadDays,
        inductionDays: parsed.data.inductionDays,
        siteLabel: parsed.data.siteLabel || undefined,
        sites,
        providers,
        allowSelfUpload: parsed.data.allowSelfUpload,
        requireVerification: parsed.data.requireVerification,
        selfTokenDays: parsed.data.selfTokenDays,
        reminderDays,
        inviteSubject: parsed.data.inviteSubject || undefined,
        inviteBody: parsed.data.inviteBody || undefined,
        organiserEmail: parsed.data.organiserEmail || undefined,
      });
      notify.success("Settings saved");
    } catch (error) {
      notify.fromError(error, "Unable to save settings");
    }
  }

  async function handleBootstrap() {
    setBootstrapping(true);
    try {
      await ensureTrainingCatalogue();
      notify.success("Catalogue ensured");
      await settingsQuery.refetch();
    } catch (error) {
      notify.fromError(error, "Unable to bootstrap catalogue");
    } finally {
      setBootstrapping(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Lead days, induction window, sites, providers, and invite templates.
        </p>
      </div>

      <FormSection title="General">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Organisation name (pack)">
            <input
              className="ims-field"
              value={orgName}
              disabled={!canEdit || updateMutation.isPending}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </FormField>
          <FormField label="Site label">
            <input
              className="ims-field"
              value={siteLabel}
              disabled={!canEdit || updateMutation.isPending}
              onChange={(e) => setSiteLabel(e.target.value)}
            />
          </FormField>
          <FormField label="Lead days (due soon)">
            <input
              type="number"
              className="ims-field"
              value={leadDays}
              disabled={!canEdit || updateMutation.isPending}
              onChange={(e) => setLeadDays(Number(e.target.value) || 0)}
            />
          </FormField>
          <FormField label="Induction window (days)">
            <input
              type="number"
              className="ims-field"
              value={inductionDays}
              disabled={!canEdit || updateMutation.isPending}
              onChange={(e) => setInductionDays(Number(e.target.value) || 0)}
            />
          </FormField>
          <FormField label="Self-token validity (days)">
            <input
              type="number"
              className="ims-field"
              value={selfTokenDays}
              disabled={!canEdit || updateMutation.isPending}
              onChange={(e) => setSelfTokenDays(Number(e.target.value) || 90)}
            />
          </FormField>
          <FormField label="Reminder days (comma-separated)">
            <input
              className="ims-field"
              value={reminderDaysText}
              disabled={!canEdit || updateMutation.isPending}
              onChange={(e) => setReminderDaysText(e.target.value)}
            />
          </FormField>
          <FormField label="Organiser email">
            <input
              type="email"
              className="ims-field"
              value={organiserEmail}
              disabled={!canEdit || updateMutation.isPending}
              onChange={(e) => setOrganiserEmail(e.target.value)}
            />
          </FormField>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allowSelfUpload}
              disabled={!canEdit || updateMutation.isPending}
              onChange={(e) => setAllowSelfUpload(e.target.checked)}
            />
            Allow self-service certificate upload
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={requireVerification}
              disabled={!canEdit || updateMutation.isPending}
              onChange={(e) => setRequireVerification(e.target.checked)}
            />
            Require manager verification of self-uploads
          </label>
        </div>
      </FormSection>

      <FormSection title="Sites">
        <p className="mb-2 text-xs text-muted-foreground">One site per line.</p>
        <textarea
          className="ims-field min-h-[80px]"
          value={sitesText}
          disabled={!canEdit || updateMutation.isPending}
          onChange={(e) => setSitesText(e.target.value)}
        />
      </FormSection>

      <FormSection title="Providers">
        <p className="mb-2 text-xs text-muted-foreground">
          One provider per line.
        </p>
        <textarea
          className="ims-field min-h-[80px]"
          value={providersText}
          disabled={!canEdit || updateMutation.isPending}
          onChange={(e) => setProvidersText(e.target.value)}
        />
      </FormSection>

      <FormSection title="Invite template">
        <FormField label="Subject">
          <input
            className="ims-field"
            value={inviteSubject}
            disabled={!canEdit || updateMutation.isPending}
            onChange={(e) => setInviteSubject(e.target.value)}
          />
        </FormField>
        <FormField label="Body">
          <textarea
            className="ims-field min-h-[120px]"
            value={inviteBody}
            disabled={!canEdit || updateMutation.isPending}
            onChange={(e) => setInviteBody(e.target.value)}
          />
        </FormField>
        <p className="text-xs text-muted-foreground">
          Placeholders: {"{{name}} {{course}} {{date}} {{time}} {{location}} {{provider}} {{trainer}} {{materials}} {{org}}"}
        </p>
      </FormSection>

      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={updateMutation.isPending}
            onClick={() => void handleSave()}
          >
            Save settings
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={bootstrapping}
            onClick={() => void handleBootstrap()}
          >
            {bootstrapping ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Ensure default catalogue
          </Button>
        </div>
      ) : null}
    </div>
  );
}
