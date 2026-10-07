import { useMemo, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { useFunctionalUnitsQuery } from "@/modules/functional-units/hooks/use-functional-units";
import { createKpiObjectiveFormSchema } from "../schemas";
import type { CreateKpiObjectiveInput, KpiPrivacy } from "../types";
import { KPI_PRIVACY } from "../types";

type FieldErrors = Record<string, string>;

type KpiCreateFormProps = {
  pending?: boolean;
  /** When false, Organisational privacy is not offered (non–global-access users). */
  allowOrganisational?: boolean;
  onSubmit: (values: CreateKpiObjectiveInput) => Promise<void> | void;
  onSuccessNavigate?: () => void;
};

export function KpiCreateForm({
  pending = false,
  allowOrganisational = true,
  onSubmit,
  onSuccessNavigate,
}: KpiCreateFormProps) {
  const defaultPrivacy: KpiPrivacy = allowOrganisational
    ? "Business unit"
    : "Business unit";
  const [value, setValue] = useState("");
  const [privacy, setPrivacy] = useState<KpiPrivacy>(defaultPrivacy);
  const [businessUnitId, setBusinessUnitId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  const unitOptions = useMemo(
    () =>
      (unitsQuery.data?.items ?? []).map((unit) => ({
        id: unit.id,
        label: unit.name,
      })),
    [unitsQuery.data]
  );

  const privacyOptions = allowOrganisational
    ? KPI_PRIVACY
    : (["Business unit"] as const);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = createKpiObjectiveFormSchema.safeParse({
      value,
      privacy,
      businessUnitId:
        privacy === "Business unit" ? businessUnitId : undefined,
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "value");
        if (!next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});

    const payload: CreateKpiObjectiveInput = {
      value: parsed.data.value,
      privacy: parsed.data.privacy,
      businessUnitId:
        parsed.data.privacy === "Business unit"
          ? parsed.data.businessUnitId
          : null,
    };
    await onSubmit(payload);
    setValue("");
    setBusinessUnitId("");
    setPrivacy(defaultPrivacy);
    onSuccessNavigate?.();
  }

  return (
    <form
      className="max-w-2xl space-y-5 rounded-lg border border-border bg-surface p-5 shadow-xs"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <FormSection
        title="Add KPI/Objective"
        description="Record a strategic statement for the organisation or a business unit. Measurement targets are not captured in this screen."
      >
        <FormField
          label="Privacy"
          htmlFor="kpi-privacy"
          required
          error={fieldErrors.privacy}
        >
          <select
            id="kpi-privacy"
            className="ims-select"
            value={privacy}
            disabled={pending}
            onChange={(event) => {
              const next = event.target.value as KpiPrivacy;
              setPrivacy(next);
              if (next === "Organisational") setBusinessUnitId("");
            }}
          >
            {privacyOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>

        {privacy === "Business unit" ? (
          <FormField
            label="Business unit"
            htmlFor="kpi-business-unit"
            required
            error={fieldErrors.businessUnitId}
          >
            <select
              id="kpi-business-unit"
              className="ims-select"
              value={businessUnitId}
              disabled={pending || unitsQuery.isLoading}
              onChange={(event) => setBusinessUnitId(event.target.value)}
            >
              <option value="">Select business unit</option>
              {unitOptions.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}

        <FormField
          label="KPI/Objective"
          htmlFor="kpi-value"
          required
          error={fieldErrors.value}
        >
          <Textarea
            id="kpi-value"
            value={value}
            rows={5}
            disabled={pending}
            placeholder="Describe the objective…"
            onChange={(event) => setValue(event.target.value)}
          />
        </FormField>
      </FormSection>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Adding…
          </>
        ) : (
          "Add KPI"
        )}
      </Button>
    </form>
  );
}
