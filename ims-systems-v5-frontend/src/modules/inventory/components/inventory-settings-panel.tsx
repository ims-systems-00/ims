import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  useInventoryCategoriesQuery,
  useInventorySettingsQuery,
  useUpdateInventorySettingsMutation,
} from "../hooks/use-inventory";
import type { InventoryCheckDef } from "../types";

type InventorySettingsPanelProps = {
  canEdit?: boolean;
};

export function InventorySettingsPanel({
  canEdit = true,
}: InventorySettingsPanelProps) {
  const settingsQuery = useInventorySettingsQuery();
  const categoriesQuery = useInventoryCategoriesQuery();
  const updateMutation = useUpdateInventorySettingsMutation();

  const [leadDays, setLeadDays] = useState(30);
  const [requireLogin, setRequireLogin] = useState(false);
  const [scanBase, setScanBase] = useState("");
  const [competentText, setCompetentText] = useState("");
  const [overrides, setOverrides] = useState<
    Record<string, InventoryCheckDef[]>
  >({});

  useEffect(() => {
    const s = settingsQuery.data;
    if (!s) return;
    setLeadDays(s.leadDays);
    setRequireLogin(s.requireLoginForScanActions);
    setScanBase(s.scanBase ?? "");
    setCompetentText((s.competentPersons ?? []).join("\n"));
    setOverrides(s.categoryOverrides ?? {});
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
        description="Could not load inventory settings."
      />
    );
  }

  const categories = categoriesQuery.data ?? [];

  async function handleSave() {
    try {
      const competentPersons = competentText
        .split(/\n|,/)
        .map((s) => s.trim())
        .filter(Boolean);
      await updateMutation.mutateAsync({
        leadDays,
        requireLoginForScanActions: requireLogin,
        scanBase: scanBase.trim() || null,
        categoryOverrides: overrides,
        competentPersons,
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
          Lead days for due-soon, scan login policy, competent persons, and
          category interval overrides.
        </p>
      </div>

      <FormSection title="General">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Lead days (due soon)">
            <input
              type="number"
              min={1}
              max={365}
              className="ims-field"
              value={leadDays}
              disabled={!canEdit || updateMutation.isPending}
              onChange={(e) => setLeadDays(Number(e.target.value) || 30)}
            />
          </FormField>
          <FormField label="Scan base URL override (optional)">
            <input
              className="ims-field"
              value={scanBase}
              disabled={!canEdit || updateMutation.isPending}
              placeholder="Leave blank to use app URL"
              onChange={(e) => setScanBase(e.target.value)}
            />
          </FormField>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={requireLogin}
            disabled={!canEdit || updateMutation.isPending}
            onChange={(e) => setRequireLogin(e.target.checked)}
          />
          Require login for scan actions
        </label>
      </FormSection>

      <FormSection title="Competent persons">
        <p className="mb-2 text-xs text-muted-foreground">
          One name per line. When this list is non-empty, checks marked as
          requiring competence (e.g. Thorough examination, Calibration) must
          use a matching name in the By field.
        </p>
        <textarea
          className="ims-field min-h-[100px]"
          value={competentText}
          disabled={!canEdit || updateMutation.isPending}
          placeholder={"D. Brooks\nCalderdale Calibration"}
          onChange={(e) => setCompetentText(e.target.value)}
        />
      </FormSection>

      <FormSection title="Category interval overrides">
        <p className="mb-3 text-xs text-muted-foreground">
          Change interval months for a check. Empty override uses the default
          catalogue.
        </p>
        <div className="space-y-4">
          {categories.map((cat) => {
            const rows = overrides[cat.name]?.length
              ? overrides[cat.name]!
              : cat.checks;
            return (
              <div
                key={cat.id}
                className="rounded-lg border border-border-subtle p-3"
              >
                <div className="mb-2 text-sm font-medium">{cat.name}</div>
                <div className="space-y-2">
                  {rows.map((check, idx) => (
                    <div
                      key={`${cat.name}-${check.name}`}
                      className="grid gap-2 sm:grid-cols-[1fr_6rem_auto]"
                    >
                      <div className="text-sm">
                        {check.name}
                        <div className="text-xs text-muted-foreground">
                          {check.basis}
                        </div>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={120}
                        className="ims-field"
                        value={check.intervalMonths}
                        disabled={!canEdit || updateMutation.isPending}
                        aria-label={`${check.name} interval months`}
                        onChange={(e) => {
                          const months = Number(e.target.value) || 0;
                          setOverrides((prev) => {
                            const base = prev[cat.name]?.length
                              ? [...prev[cat.name]!]
                              : cat.checks.map((c) => ({ ...c }));
                            base[idx] = {
                              ...base[idx]!,
                              intervalMonths: months,
                            };
                            return { ...prev, [cat.name]: base };
                          });
                        }}
                      />
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={Boolean(check.requiresCompetence)}
                          disabled={!canEdit || updateMutation.isPending}
                          onChange={(e) => {
                            const requiresCompetence = e.target.checked;
                            setOverrides((prev) => {
                              const base = prev[cat.name]?.length
                                ? [...prev[cat.name]!]
                                : cat.checks.map((c) => ({ ...c }));
                              base[idx] = {
                                ...base[idx]!,
                                requiresCompetence,
                              };
                              return { ...prev, [cat.name]: base };
                            });
                          }}
                        />
                        Competence
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </FormSection>

      {canEdit ? (
        <Button
          type="button"
          disabled={updateMutation.isPending}
          onClick={() => void handleSave()}
        >
          Save settings
        </Button>
      ) : null}
    </div>
  );
}
