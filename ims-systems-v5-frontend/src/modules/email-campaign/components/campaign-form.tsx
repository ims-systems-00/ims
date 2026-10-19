import { useMemo, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { useFunctionalUnitsQuery } from "@/modules/functional-units/hooks/use-functional-units";
import { useCustomersQuery } from "@/modules/customers/hooks/use-customers";
import {
  CUSTOMER_STAGES,
  type CustomerStage,
} from "@/modules/customers/types";
import type { CustomAudienceEntry } from "../types";
import type { EmailCampaignFormValues } from "../schemas";

type CampaignFormProps = {
  mode: "create" | "edit";
  initialValues?: Partial<EmailCampaignFormValues>;
  pending?: boolean;
  onSubmit: (values: EmailCampaignFormValues, action: FormAction) => void;
  onCancel?: () => void;
};

export type FormAction =
  | "save"
  | "launch"
  | "save-modified"
  | "launch-modified"
  | "close";

const emptyValues: EmailCampaignFormValues = {
  name: "",
  businessUnitId: "",
  target: [],
  customAudience: [],
  subject: "",
  message: "",
};

export function CampaignForm({
  mode,
  initialValues,
  pending,
  onSubmit,
  onCancel,
}: CampaignFormProps) {
  const [values, setValues] = useState<EmailCampaignFormValues>({
    ...emptyValues,
    ...initialValues,
    target: initialValues?.target ?? [],
    customAudience: initialValues?.customAudience ?? [],
  });
  const [error, setError] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");

  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  const customersQuery = useCustomersQuery({
    page: 1,
    pageSize: 20,
    search: customerSearch || undefined,
    businessUnitIds: values.businessUnitId
      ? [values.businessUnitId]
      : undefined,
  });

  const hasAudience =
    values.target.length > 0 || values.customAudience.length > 0;

  function toggleStage(stage: CustomerStage) {
    setValues((prev) => ({
      ...prev,
      target: prev.target.includes(stage)
        ? prev.target.filter((s) => s !== stage)
        : [...prev.target, stage],
    }));
  }

  function toggleCustomer(entry: CustomAudienceEntry) {
    setValues((prev) => {
      const exists = prev.customAudience.some(
        (c) => c.customerId === entry.customerId
      );
      return {
        ...prev,
        customAudience: exists
          ? prev.customAudience.filter(
              (c) => c.customerId !== entry.customerId
            )
          : [...prev.customAudience, entry],
      };
    });
  }

  function validate(): boolean {
    if (mode === "create" && !values.name.trim()) {
      setError("Campaign name is required");
      return false;
    }
    if (!values.businessUnitId) {
      setError("Business unit is required");
      return false;
    }
    if (!values.subject.trim() || !values.message.trim()) {
      setError("Subject and message are required");
      return false;
    }
    if (!hasAudience) {
      setError("Select at least one stage or additional customer");
      return false;
    }
    setError(null);
    return true;
  }

  function submit(action: FormAction) {
    if (action !== "close" && !validate()) return;
    onSubmit(values, action);
  }

  const selectedIds = useMemo(
    () => new Set(values.customAudience.map((c) => c.customerId)),
    [values.customAudience]
  );

  return (
    <div className="flex flex-col gap-4">
      {mode === "create" ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Campaign name</span>
          <input
            className="rounded-md border border-border bg-background px-3 py-2"
            value={values.name}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, name: e.target.value }))
            }
            disabled={pending}
          />
        </label>
      ) : (
        <div className="text-sm">
          <span className="text-muted-foreground">Campaign name</span>
          <p className="font-medium">{values.name}</p>
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Business unit</span>
        <select
          className="rounded-md border border-border bg-background px-3 py-2"
          value={values.businessUnitId}
          onChange={(e) =>
            setValues((prev) => ({
              ...prev,
              businessUnitId: e.target.value,
            }))
          }
          disabled={pending}
        >
          <option value="">Select unit</option>
          {(unitsQuery.data?.items ?? []).map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="font-medium">Target audience (stages)</legend>
        <div className="flex flex-wrap gap-2">
          {CUSTOMER_STAGES.map((stage) => (
            <label
              key={stage}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1"
            >
              <input
                type="checkbox"
                checked={values.target.includes(stage)}
                onChange={() => toggleStage(stage)}
                disabled={pending}
              />
              {stage}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2 text-sm">
        <span className="font-medium">Additional audience</span>
        <input
          className="rounded-md border border-border bg-background px-3 py-2"
          placeholder="Search customers…"
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          disabled={pending || !values.businessUnitId}
        />
        <div className="max-h-40 overflow-auto rounded-md border border-border">
          {(customersQuery.data?.items ?? []).map((customer) => (
            <label
              key={customer.id}
              className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2 last:border-0"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(customer.id)}
                onChange={() =>
                  toggleCustomer({
                    customerId: customer.id,
                    name: customer.name,
                    reference: customer.reference,
                  })
                }
                disabled={pending}
              />
              <span className="truncate">
                {customer.reference} · {customer.name}
              </span>
            </label>
          ))}
          {!customersQuery.isLoading &&
            (customersQuery.data?.items.length ?? 0) === 0 && (
              <p className="px-3 py-2 text-muted-foreground">
                No customers found
              </p>
            )}
        </div>
        {values.customAudience.length > 0 && (
          <p className="text-muted-foreground">
            {values.customAudience.length} customer
            {values.customAudience.length === 1 ? "" : "s"} selected
          </p>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Subject</span>
        <input
          className="rounded-md border border-border bg-background px-3 py-2"
          value={values.subject}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, subject: e.target.value }))
          }
          disabled={pending}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Message</span>
        <textarea
          className="min-h-32 rounded-md border border-border bg-background px-3 py-2"
          value={values.message}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, message: e.target.value }))
          }
          disabled={pending}
        />
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        {mode === "create" ? (
          <>
            <Button
              type="button"
              disabled={pending || !hasAudience}
              onClick={() => submit("launch")}
            >
              Launch campaign
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending || !hasAudience}
              onClick={() => submit("save")}
            >
              Save draft
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              disabled={pending || !hasAudience}
              onClick={() => submit("launch-modified")}
            >
              Launch modified campaign
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending || !hasAudience}
              onClick={() => submit("save-modified")}
            >
              Save modified campaign
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => submit("close")}
            >
              Close campaign
            </Button>
          </>
        )}
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
