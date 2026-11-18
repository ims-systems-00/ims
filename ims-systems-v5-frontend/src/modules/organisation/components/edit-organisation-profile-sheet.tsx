import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/toast";
import { useUpdateOrganisationProfileMutation } from "../hooks/use-organisations";
import {
  updateOrganisationProfileSchema,
  type UpdateOrganisationProfileValues,
} from "../schemas";
import type { OrganisationProfile } from "../types";

type EditOrganisationProfileSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisation: OrganisationProfile;
};

type FieldErrors = Partial<
  Record<keyof UpdateOrganisationProfileValues, string>
>;

function toFormState(organisation: OrganisationProfile) {
  return {
    name: organisation.name,
    officeEmail: organisation.officeEmail,
    companyNumber: organisation.companyNumber ?? "",
    vatNumber: organisation.vatNumber ?? "",
    bankName: organisation.bankName ?? "",
    sortCode: organisation.sortCode ?? "",
    accountNumber: organisation.accountNumber ?? "",
    costPerMile:
      organisation.costPerMile === null || organisation.costPerMile === undefined
        ? ""
        : String(organisation.costPerMile),
    line1: organisation.address.line1,
    line2: organisation.address.line2 ?? "",
    city: organisation.address.city,
    county: organisation.address.county,
    postCode: organisation.address.postCode,
  };
}

/**
 * Super Admin sheet to edit safe organisation profile fields (V4 parity).
 */
export function EditOrganisationProfileSheet({
  open,
  onOpenChange,
  organisation,
}: EditOrganisationProfileSheetProps) {
  const mutation = useUpdateOrganisationProfileMutation();
  const [values, setValues] = useState(() => toFormState(organisation));
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open) return;
    setValues(toFormState(organisation));
    setErrors({});
  }, [open, organisation]);

  function setField<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = updateOrganisationProfileSchema.safeParse(values);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !next[key as keyof FieldErrors]) {
          next[key as keyof FieldErrors] = issue.message;
        }
      }
      setErrors(next);
      return;
    }

    setErrors({});
    try {
      await mutation.mutateAsync({
        name: parsed.data.name,
        officeEmail: parsed.data.officeEmail,
        companyNumber: parsed.data.companyNumber,
        vatNumber: parsed.data.vatNumber,
        bankName: parsed.data.bankName,
        sortCode: parsed.data.sortCode,
        accountNumber: parsed.data.accountNumber,
        costPerMile: parsed.data.costPerMile,
        address: {
          line1: parsed.data.line1,
          line2: parsed.data.line2,
          city: parsed.data.city,
          county: parsed.data.county,
          postCode: parsed.data.postCode,
        },
      });
      notify.success("Organisation details updated");
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to update organisation details");
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Edit organisation"
      description="Update contact and address details. Licences, billing, and status are unchanged."
      className="sm:max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-organisation-profile-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      }
    >
      <form
        id="edit-organisation-profile-form"
        className="space-y-4"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <FormField label="Name" htmlFor="edit-org-name" required error={errors.name}>
          <Input
            id="edit-org-name"
            value={values.name}
            onChange={(event) => setField("name", event.target.value)}
          />
        </FormField>
        <FormField
          label="Organisation email"
          htmlFor="edit-org-email"
          required
          error={errors.officeEmail}
        >
          <Input
            id="edit-org-email"
            type="email"
            value={values.officeEmail}
            onChange={(event) => setField("officeEmail", event.target.value)}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Building"
            htmlFor="edit-org-line1"
            required
            error={errors.line1}
          >
            <Input
              id="edit-org-line1"
              value={values.line1}
              onChange={(event) => setField("line1", event.target.value)}
            />
          </FormField>
          <FormField label="Street" htmlFor="edit-org-line2" error={errors.line2}>
            <Input
              id="edit-org-line2"
              value={values.line2}
              onChange={(event) => setField("line2", event.target.value)}
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="City" htmlFor="edit-org-city" required error={errors.city}>
            <Input
              id="edit-org-city"
              value={values.city}
              onChange={(event) => setField("city", event.target.value)}
            />
          </FormField>
          <FormField
            label="State / province"
            htmlFor="edit-org-county"
            required
            error={errors.county}
          >
            <Input
              id="edit-org-county"
              value={values.county}
              onChange={(event) => setField("county", event.target.value)}
            />
          </FormField>
        </div>

        <FormField
          label="Post code"
          htmlFor="edit-org-post"
          required
          error={errors.postCode}
        >
          <Input
            id="edit-org-post"
            value={values.postCode}
            onChange={(event) => setField("postCode", event.target.value)}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Company number"
            htmlFor="edit-org-company"
            error={errors.companyNumber}
          >
            <Input
              id="edit-org-company"
              value={values.companyNumber}
              onChange={(event) => setField("companyNumber", event.target.value)}
            />
          </FormField>
          <FormField label="VAT number" htmlFor="edit-org-vat" error={errors.vatNumber}>
            <Input
              id="edit-org-vat"
              value={values.vatNumber}
              onChange={(event) => setField("vatNumber", event.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Bank name" htmlFor="edit-org-bank" error={errors.bankName}>
          <Input
            id="edit-org-bank"
            value={values.bankName}
            onChange={(event) => setField("bankName", event.target.value)}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Sort code" htmlFor="edit-org-sort" error={errors.sortCode}>
            <Input
              id="edit-org-sort"
              value={values.sortCode}
              onChange={(event) => setField("sortCode", event.target.value)}
            />
          </FormField>
          <FormField
            label="Account number"
            htmlFor="edit-org-account"
            error={errors.accountNumber}
          >
            <Input
              id="edit-org-account"
              value={values.accountNumber}
              onChange={(event) => setField("accountNumber", event.target.value)}
            />
          </FormField>
        </div>

        <FormField
          label="Cost per mile"
          htmlFor="edit-org-cpm"
          error={errors.costPerMile}
        >
          <Input
            id="edit-org-cpm"
            type="number"
            min={0}
            step="0.01"
            value={values.costPerMile}
            onChange={(event) => setField("costPerMile", event.target.value)}
          />
        </FormField>
      </form>
    </AppSheet>
  );
}
