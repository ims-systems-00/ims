import { useMemo, useState, type FormEvent } from "react";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { useFunctionalUnitsQuery } from "@/modules/functional-units/hooks/use-functional-units";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import {
  createCustomerFormSchema,
  updateCustomerFormSchema,
} from "../schemas";
import {
  CUSTOMER_PROBABILITIES,
  CUSTOMER_STAGES,
  CUSTOMER_STATUSES,
  type CreateCustomerInput,
  type Customer,
  type CustomerStage,
  type CustomerStatus,
  type UpdateCustomerInput,
} from "../types";

type FieldErrors = Record<string, string>;

type CustomerFormProps = {
  mode: "create" | "edit";
  formId: string;
  pending?: boolean;
  hideActions?: boolean;
  initialCustomer?: Customer;
  onSubmit: (
    values: CreateCustomerInput | UpdateCustomerInput
  ) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel: string;
};

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function emptyToNull(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function CustomerForm({
  mode,
  formId,
  pending = false,
  hideActions = false,
  initialCustomer,
  onSubmit,
  onCancel,
  submitLabel,
}: CustomerFormProps) {
  const [name, setName] = useState(initialCustomer?.name ?? "");
  const [primaryEmail, setPrimaryEmail] = useState(
    initialCustomer?.primaryEmail ?? ""
  );
  const [companyNumber, setCompanyNumber] = useState(
    initialCustomer?.companyNumber ?? ""
  );
  const [stage, setStage] = useState<CustomerStage>(
    initialCustomer?.stage ?? "Prospect"
  );
  const [status, setStatus] = useState<CustomerStatus>(
    initialCustomer?.status ?? "Open"
  );
  const [probability, setProbability] = useState(
    String(initialCustomer?.probability ?? 10)
  );
  const [source, setSource] = useState(initialCustomer?.source ?? "");
  const [phoneNumber, setPhoneNumber] = useState(
    initialCustomer?.phoneNumber ?? ""
  );
  const [buildingName, setBuildingName] = useState(
    initialCustomer?.buildingName ?? ""
  );
  const [streetName, setStreetName] = useState(
    initialCustomer?.streetName ?? ""
  );
  const [town, setTown] = useState(initialCustomer?.town ?? "");
  const [postCode, setPostCode] = useState(initialCustomer?.postCode ?? "");
  const [primaryContact, setPrimaryContact] = useState(
    initialCustomer?.primaryContact ?? ""
  );
  const [secondaryContact, setSecondaryContact] = useState(
    initialCustomer?.secondaryContact ?? ""
  );
  const [secondaryEmail, setSecondaryEmail] = useState(
    initialCustomer?.secondaryEmail ?? ""
  );
  const [serviceProvision, setServiceProvision] = useState(
    initialCustomer?.serviceProvision ?? ""
  );
  const [contractValue, setContractValue] = useState(
    initialCustomer?.contractValue != null
      ? String(initialCustomer.contractValue)
      : "0"
  );
  const [accountManager, setAccountManager] = useState(
    initialCustomer?.accountManager ?? ""
  );
  const [accountNumber, setAccountNumber] = useState(
    initialCustomer?.accountNumber ?? ""
  );
  const [contractStartDate, setContractStartDate] = useState(
    toDateInput(initialCustomer?.contractStartDate)
  );
  const [contractEndDate, setContractEndDate] = useState(
    toDateInput(initialCustomer?.contractEndDate)
  );
  const [reviewDate, setReviewDate] = useState(
    toDateInput(initialCustomer?.reviewDate)
  );
  const [notes, setNotes] = useState(initialCustomer?.notes ?? "");
  const [reasonForLoss, setReasonForLoss] = useState(
    initialCustomer?.reasonForLoss ?? ""
  );
  const [businessUnitId, setBusinessUnitId] = useState(
    initialCustomer?.businessUnitId ?? ""
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });

  const userOptions = useMemo(
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

  const isLive = stage === "Live";
  const isLost = status === "Lost";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFieldErrors({});

    const payload = {
      name,
      primaryEmail,
      businessUnitId,
      companyNumber,
      stage,
      status: isLive ? "Open" : status,
      probability: Number(probability),
      source,
      phoneNumber,
      buildingName,
      streetName,
      town,
      postCode,
      primaryContact,
      secondaryContact,
      secondaryEmail,
      serviceProvision,
      contractValue,
      accountManager,
      accountNumber,
      contractStartDate,
      contractEndDate,
      reviewDate,
      notes,
      reasonForLoss,
    };

    if (mode === "create") {
      const parsed = createCustomerFormSchema.safeParse(payload);
      if (!parsed.success) {
        const next: FieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? "form");
          if (!next[key]) next[key] = issue.message;
        }
        setFieldErrors(next);
        return;
      }
      try {
        await onSubmit({
          ...parsed.data,
          contractStartDate: parsed.data.contractStartDate ?? null,
          contractEndDate: parsed.data.contractEndDate ?? null,
          reviewDate: parsed.data.reviewDate ?? null,
        });
      } catch (error) {
        notify.fromError(error, "Unable to register customer");
      }
      return;
    }

    const parsed = updateCustomerFormSchema.safeParse(payload);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      return;
    }

    try {
      await onSubmit({
        name: parsed.data.name,
        primaryEmail: parsed.data.primaryEmail,
        businessUnitId: parsed.data.businessUnitId,
        companyNumber: emptyToNull(parsed.data.companyNumber),
        stage: parsed.data.stage,
        status: parsed.data.status,
        probability: parsed.data.probability,
        source: emptyToNull(parsed.data.source),
        phoneNumber: emptyToNull(parsed.data.phoneNumber),
        buildingName: emptyToNull(parsed.data.buildingName),
        streetName: emptyToNull(parsed.data.streetName),
        town: emptyToNull(parsed.data.town),
        postCode: emptyToNull(parsed.data.postCode),
        primaryContact: emptyToNull(parsed.data.primaryContact),
        secondaryContact: emptyToNull(parsed.data.secondaryContact),
        secondaryEmail: emptyToNull(parsed.data.secondaryEmail),
        serviceProvision: emptyToNull(parsed.data.serviceProvision),
        contractValue: parsed.data.contractValue,
        accountManager: parsed.data.accountManager,
        accountNumber: emptyToNull(parsed.data.accountNumber),
        contractStartDate: emptyToNull(parsed.data.contractStartDate),
        contractEndDate: emptyToNull(parsed.data.contractEndDate),
        reviewDate: emptyToNull(parsed.data.reviewDate),
        notes: emptyToNull(parsed.data.notes),
        reasonForLoss: emptyToNull(parsed.data.reasonForLoss),
      });
    } catch (error) {
      notify.fromError(error, "Unable to update customer");
    }
  }

  return (
    <form
      id={formId}
      className="space-y-6"
      onSubmit={(e) => void handleSubmit(e)}
      noValidate
    >
      <FormSection title="Organisation">
        <FormField label="Organisation name" required error={fieldErrors.name}>
          <input
            className="ims-field"
            value={name}
            disabled={pending}
            onChange={(event) => setName(event.target.value)}
          />
        </FormField>
        <FormField label="Registration number" error={fieldErrors.companyNumber}>
          <input
            className="ims-field"
            value={companyNumber}
            disabled={pending}
            onChange={(event) => setCompanyNumber(event.target.value)}
          />
        </FormField>
        <FormField label="Business unit" error={fieldErrors.businessUnitId}>
          <select
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
        <FormField
          label="Organisation profile"
          required
          error={fieldErrors.stage}
          description="Pipeline stage"
        >
          <select
            className="ims-select"
            value={stage}
            disabled={pending}
            onChange={(event) =>
              setStage(event.target.value as CustomerStage)
            }
          >
            {CUSTOMER_STAGES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </FormField>
        {!isLive ? (
          <FormField label="Status" error={fieldErrors.status}>
            <select
              className="ims-select"
              value={status}
              disabled={pending}
              onChange={(event) =>
                setStatus(event.target.value as CustomerStatus)
              }
            >
              {CUSTOMER_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}
        {!isLive ? (
          <FormField label="Probability" error={fieldErrors.probability}>
            <select
              className="ims-select"
              value={probability}
              disabled={pending}
              onChange={(event) => setProbability(event.target.value)}
            >
              {CUSTOMER_PROBABILITIES.map((value) => (
                <option key={value} value={value}>
                  {value}%
                </option>
              ))}
            </select>
          </FormField>
        ) : null}
        {isLost ? (
          <FormField
            label="Reason for loss"
            required
            error={fieldErrors.reasonForLoss}
          >
            <textarea
              className="ims-field min-h-[4rem] py-2 leading-relaxed"
              value={reasonForLoss}
              disabled={pending}
              onChange={(event) => setReasonForLoss(event.target.value)}
            />
          </FormField>
        ) : null}
      </FormSection>

      <FormSection title="Address & contacts">
        <FormField label="Building" error={fieldErrors.buildingName}>
          <input
            className="ims-field"
            value={buildingName}
            disabled={pending}
            onChange={(event) => setBuildingName(event.target.value)}
          />
        </FormField>
        <FormField label="Street" error={fieldErrors.streetName}>
          <input
            className="ims-field"
            value={streetName}
            disabled={pending}
            onChange={(event) => setStreetName(event.target.value)}
          />
        </FormField>
        <FormField label="Town" error={fieldErrors.town}>
          <input
            className="ims-field"
            value={town}
            disabled={pending}
            onChange={(event) => setTown(event.target.value)}
          />
        </FormField>
        <FormField label="Post code" error={fieldErrors.postCode}>
          <input
            className="ims-field"
            value={postCode}
            disabled={pending}
            onChange={(event) => setPostCode(event.target.value)}
          />
        </FormField>
        <FormField label="Primary contact" error={fieldErrors.primaryContact}>
          <input
            className="ims-field"
            value={primaryContact}
            disabled={pending}
            onChange={(event) => setPrimaryContact(event.target.value)}
          />
        </FormField>
        <FormField
          label="Primary email"
          required
          error={fieldErrors.primaryEmail}
        >
          <input
            type="email"
            className="ims-field"
            value={primaryEmail}
            disabled={pending}
            onChange={(event) => setPrimaryEmail(event.target.value)}
          />
        </FormField>
        <FormField
          label="Secondary contact"
          error={fieldErrors.secondaryContact}
        >
          <input
            className="ims-field"
            value={secondaryContact}
            disabled={pending}
            onChange={(event) => setSecondaryContact(event.target.value)}
          />
        </FormField>
        <FormField
          label="Secondary email"
          error={fieldErrors.secondaryEmail}
        >
          <input
            type="email"
            className="ims-field"
            value={secondaryEmail}
            disabled={pending}
            onChange={(event) => setSecondaryEmail(event.target.value)}
          />
        </FormField>
        <FormField label="Phone" error={fieldErrors.phoneNumber}>
          <input
            className="ims-field"
            value={phoneNumber}
            disabled={pending}
            onChange={(event) => setPhoneNumber(event.target.value)}
          />
        </FormField>
        <FormField label="Source" error={fieldErrors.source}>
          <input
            className="ims-field"
            value={source}
            disabled={pending}
            onChange={(event) => setSource(event.target.value)}
          />
        </FormField>
      </FormSection>

      <FormSection title="Commercial">
        <FormField label="Account manager" error={fieldErrors.accountManager}>
          <select
            className="ims-select"
            value={accountManager}
            disabled={pending || usersQuery.isLoading}
            onChange={(event) => setAccountManager(event.target.value)}
          >
            <option value="">Unassigned</option>
            {userOptions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label="Contract value (£)"
          error={fieldErrors.contractValue}
        >
          <input
            type="number"
            min={0}
            step={1}
            className="ims-field"
            value={contractValue}
            disabled={pending}
            onChange={(event) => setContractValue(event.target.value)}
          />
        </FormField>
        <FormField
          label="Service provision"
          error={fieldErrors.serviceProvision}
        >
          <textarea
            className="ims-field min-h-[5rem] py-2 leading-relaxed"
            value={serviceProvision}
            disabled={pending}
            onChange={(event) => setServiceProvision(event.target.value)}
          />
        </FormField>
        {isLive ? (
          <>
            <FormField label="Account number" error={fieldErrors.accountNumber}>
              <input
                className="ims-field"
                value={accountNumber}
                disabled={pending}
                onChange={(event) => setAccountNumber(event.target.value)}
              />
            </FormField>
            <FormField
              label="Contract start"
              required
              error={fieldErrors.contractStartDate}
            >
              <input
                type="date"
                className="ims-field"
                value={contractStartDate}
                disabled={pending}
                onChange={(event) => setContractStartDate(event.target.value)}
              />
            </FormField>
            <FormField
              label="Contract end"
              required
              error={fieldErrors.contractEndDate}
            >
              <input
                type="date"
                className="ims-field"
                value={contractEndDate}
                disabled={pending}
                onChange={(event) => setContractEndDate(event.target.value)}
              />
            </FormField>
            <FormField
              label="Review date"
              required
              error={fieldErrors.reviewDate}
            >
              <input
                type="date"
                className="ims-field"
                value={reviewDate}
                disabled={pending}
                onChange={(event) => setReviewDate(event.target.value)}
              />
            </FormField>
          </>
        ) : null}
        <FormField label="Notes" error={fieldErrors.notes}>
          <textarea
            className="ims-field min-h-[4rem] py-2 leading-relaxed"
            value={notes}
            disabled={pending}
            onChange={(event) => setNotes(event.target.value)}
          />
        </FormField>
      </FormSection>

      {!hideActions ? (
        <CustomerFormActions
          formId={formId}
          submitLabel={submitLabel}
          pending={pending}
          onCancel={onCancel}
        />
      ) : null}
    </form>
  );
}

export function CustomerFormActions({
  formId,
  submitLabel,
  pending,
  onCancel,
}: {
  formId: string;
  submitLabel: string;
  pending?: boolean;
  onCancel?: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
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
      <Button type="submit" form={formId} disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </div>
  );
}
