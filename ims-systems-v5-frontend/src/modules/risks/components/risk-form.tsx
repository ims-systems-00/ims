import { useMemo, useState, type FormEvent } from "react";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { useFunctionalUnitsQuery } from "@/modules/functional-units/hooks/use-functional-units";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import { useAssetsQuery } from "@/modules/assets/hooks/use-assets";
import type { AnyAsset, AssetCategory } from "@/modules/assets/types";
import { CategorySelectField } from "@/modules/tags-and-categories";
import {
  createRiskFormSchema,
  updateRiskFormSchema,
  type CreateRiskFormValues,
  type UpdateRiskFormValues,
} from "../schemas";
import {
  isAssetLinkableRiskType,
  RISK_TYPES,
  type CreateRiskInput,
  type Risk,
  type RiskType,
  type UpdateRiskInput,
} from "../types";
import { ScoreInputs } from "./risk-score-assessment";

type FieldErrors = Record<string, string>;

type RiskFormProps = {
  mode: "create" | "edit";
  formId: string;
  pending?: boolean;
  hideActions?: boolean;
  initialRisk?: Risk;
  lockedFromSource?: boolean;
  onSubmit: (
    values: CreateRiskInput | UpdateRiskInput
  ) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel: string;
};

function riskTypeToAssetCategory(type: RiskType): AssetCategory | null {
  switch (type) {
    case "Hardware":
      return "hardware";
    case "Software":
      return "software";
    case "People":
      return "people";
    case "Premise":
      return "premise";
    default:
      return null;
  }
}

export function RiskForm({
  mode,
  formId,
  pending = false,
  hideActions = false,
  initialRisk,
  lockedFromSource = false,
  onSubmit,
  onCancel,
  submitLabel,
}: RiskFormProps) {
  const [title, setTitle] = useState(initialRisk?.title ?? "");
  const [description, setDescription] = useState(
    initialRisk?.description ?? ""
  );
  const [type, setType] = useState<RiskType>(initialRisk?.type ?? "Hardware");
  const [ownerId, setOwnerId] = useState(initialRisk?.ownerId ?? "");
  const [businessUnitId, setBusinessUnitId] = useState(
    initialRisk?.businessUnitId ?? ""
  );
  const [assetId, setAssetId] = useState(initialRisk?.assetId ?? "");
  const [categoryId, setCategoryId] = useState(initialRisk?.categoryId ?? "");
  const [likelihood, setLikelihood] = useState(
    initialRisk?.currentScore.likelihood ?? 1
  );
  const [consequence, setConsequence] = useState(
    initialRisk?.currentScore.consequence ?? 1
  );
  const [mitigationText, setMitigationText] = useState(
    initialRisk?.mitigationText ?? ""
  );
  const [acceptanceRationale, setAcceptanceRationale] = useState(
    initialRisk?.acceptanceRationale ?? ""
  );
  const [decisionMaker, setDecisionMaker] = useState(
    initialRisk?.decisionMaker ?? ""
  );
  const [mitigated, setMitigated] = useState(
    Boolean(initialRisk?.mitigated.status)
  );
  const [accepted, setAccepted] = useState(
    Boolean(initialRisk?.accepted.status)
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  const assetCategory = riskTypeToAssetCategory(type);
  const assetsQuery = useAssetsQuery(
    assetCategory ?? "hardware",
    { page: 1, pageSize: 100 }
  );
  const showAsset = isAssetLinkableRiskType(type);

  const ownerOptions = useMemo(
    () =>
      (usersQuery.data?.items ?? []).map((row) => ({
        id: row.user.id,
        label: `${row.user.name} (${row.user.email})`,
      })),
    [usersQuery.data]
  );

  const unitOptions = useMemo(
    () =>
      (unitsQuery.data?.items ?? []).map((unit) => ({
        id: unit.id,
        label: unit.name,
      })),
    [unitsQuery.data]
  );

  const assetOptions = useMemo(() => {
    if (!showAsset || !assetCategory || !assetsQuery.data) return [];
    return (assetsQuery.data.items as AnyAsset[]).map((asset) => {
      const labelName =
        "title" in asset && asset.title
          ? asset.title
          : "name" in asset && asset.name
            ? asset.name
            : asset.reference;
      return { id: asset.id, label: `${labelName} (${asset.reference})` };
    });
  }, [assetsQuery.data, assetCategory, showAsset]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (mode === "create") {
      const parsed = createRiskFormSchema.safeParse({
        title,
        description,
        type,
        ownerId,
        businessUnitId,
        assetId: showAsset ? assetId : undefined,
        categoryId: categoryId || undefined,
        likelihood,
        consequence,
      });
      if (!parsed.success) {
        const next: FieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string" && !next[key]) next[key] = issue.message;
        }
        setFieldErrors(next);
        return;
      }
      setFieldErrors({});
      const data = parsed.data as CreateRiskFormValues;
      try {
        await onSubmit({
          title: data.title,
          description: data.description,
          type: data.type,
          ownerId: data.ownerId,
          businessUnitId: data.businessUnitId,
          assetId: data.assetId,
          categoryId: data.categoryId,
          likelihood: data.likelihood,
          consequence: data.consequence,
        });
      } catch (error) {
        notify.fromError(error, "Unable to raise risk");
      }
      return;
    }

    if (mitigated && !mitigationText.trim()) {
      setFieldErrors({
        mitigationText: "Mitigation text is required when marking mitigated",
      });
      return;
    }
    if (accepted && !acceptanceRationale.trim()) {
      setFieldErrors({
        acceptanceRationale:
          "Acceptance rationale is required when accepting a risk",
      });
      return;
    }

    const parsed = updateRiskFormSchema.safeParse({
      title,
      description,
      type,
      ownerId,
      assetId: showAsset ? assetId : "",
      categoryId: categoryId || "",
      likelihood,
      consequence,
      mitigationText,
      acceptanceRationale,
      decisionMaker,
      mitigated,
      accepted,
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    const data = parsed.data as UpdateRiskFormValues;
    try {
      await onSubmit({
        title: data.title,
        description: data.description,
        type: data.type,
        ownerId: data.ownerId,
        assetId: showAsset ? data.assetId : null,
        categoryId: data.categoryId,
        likelihood: data.likelihood,
        consequence: data.consequence,
        mitigationText: data.mitigationText || null,
        acceptanceRationale: data.acceptanceRationale || null,
        decisionMaker: data.decisionMaker || null,
        mitigated: data.mitigated,
        accepted: data.accepted,
      });
    } catch (error) {
      notify.fromError(error, "Unable to update risk");
    }
  }

  const identityLocked = lockedFromSource;

  return (
    <form id={formId} className="space-y-6" onSubmit={handleSubmit} noValidate>
      <FormSection title="Risk identity">
        <FormField label="Title" required error={fieldErrors.title}>
          <input
            className="ims-field"
            value={title}
            disabled={pending || identityLocked}
            onChange={(event) => setTitle(event.target.value)}
          />
        </FormField>
        <FormField
          label="Description"
          required
          error={fieldErrors.description}
        >
          <textarea
            className="ims-field min-h-[5.5rem] py-2 leading-relaxed"
            value={description}
            disabled={pending || identityLocked}
            onChange={(event) => setDescription(event.target.value)}
          />
        </FormField>
        <FormField label="Type" required error={fieldErrors.type}>
          <select
            className="ims-select"
            value={type}
            disabled={pending}
            onChange={(event) => {
              const next = event.target.value as RiskType;
              setType(next);
              if (!isAssetLinkableRiskType(next)) setAssetId("");
            }}
          >
            {RISK_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>
      </FormSection>

      <FormSection title="Classification">
        <CategorySelectField
          applicableModule="risks"
          value={categoryId || undefined}
          disabled={pending}
          error={fieldErrors.categoryId}
          onChange={(next) => setCategoryId(next ?? "")}
        />
      </FormSection>

      <FormSection title="Ownership">
        <FormField label="Risk owner" required={mode === "create"} error={fieldErrors.ownerId}>
          <select
            className="ims-select"
            value={ownerId}
            disabled={pending}
            onChange={(event) => setOwnerId(event.target.value)}
          >
            <option value="">Select owner</option>
            {ownerOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
        {mode === "create" ? (
          <FormField
            label="Business unit"
            description="Optional. Cannot be changed after the risk is raised."
            error={fieldErrors.businessUnitId}
          >
            <select
              className="ims-select"
              value={businessUnitId}
              disabled={pending}
              onChange={(event) => setBusinessUnitId(event.target.value)}
            >
              <option value="">No business unit</option>
              {unitOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
        ) : initialRisk?.businessUnitId ? (
          <p className="ims-text-meta">
            Business unit is fixed after create.
          </p>
        ) : null}
        {showAsset ? (
          <FormField label="Related asset" error={fieldErrors.assetId}>
            <select
              className="ims-select"
              value={assetId}
              disabled={pending || assetsQuery.isLoading}
              onChange={(event) => setAssetId(event.target.value)}
            >
              <option value="">No linked asset</option>
              {assetOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}
      </FormSection>

      <FormSection
        title="Assessment"
        description="Likelihood and consequence are scored from 1 to 5."
      >
        <ScoreInputs
          likelihood={likelihood}
          consequence={consequence}
          disabled={pending}
          likelihoodError={fieldErrors.likelihood}
          consequenceError={fieldErrors.consequence}
          onLikelihoodChange={setLikelihood}
          onConsequenceChange={setConsequence}
        />
      </FormSection>

      {mode === "edit" ? (
        <FormSection title="Treatment">
          <FormField
            label="Controls and mitigation"
            error={fieldErrors.mitigationText}
          >
            <textarea
              className="ims-field min-h-[4.5rem] py-2 leading-relaxed"
              value={mitigationText}
              disabled={pending}
              onChange={(event) => setMitigationText(event.target.value)}
            />
          </FormField>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={mitigated}
              disabled={pending || Boolean(initialRisk?.mitigated.status)}
              onChange={(event) => setMitigated(event.target.checked)}
            />
            <span>
              Mark as mitigated
              <span className="mt-0.5 block ims-text-meta">
                Mitigated risks cannot be edited further.
              </span>
            </span>
          </label>
          <FormField
            label="Acceptance rationale"
            error={fieldErrors.acceptanceRationale}
          >
            <textarea
              className="ims-field min-h-[4.5rem] py-2 leading-relaxed"
              value={acceptanceRationale}
              disabled={pending}
              onChange={(event) => setAcceptanceRationale(event.target.value)}
            />
          </FormField>
          <FormField label="Decision maker" error={fieldErrors.decisionMaker}>
            <input
              className="ims-field"
              value={decisionMaker}
              disabled={pending}
              onChange={(event) => setDecisionMaker(event.target.value)}
            />
          </FormField>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={accepted}
              disabled={pending || Boolean(initialRisk?.accepted.status)}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            <span>Mark as accepted</span>
          </label>
        </FormSection>
      ) : null}

      {!hideActions ? (
        <div className="flex justify-end gap-2">
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onCancel}
            >
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
