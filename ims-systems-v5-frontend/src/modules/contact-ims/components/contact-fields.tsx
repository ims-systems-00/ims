import { FormField } from "@/shared/components/form-field";
import { Input } from "@/shared/components/ui/input";
import type { ContactImsContactInput } from "../types";

export type ContactFieldErrors = Record<string, string>;

type ContactFieldsProps = {
  idPrefix: string;
  values: ContactImsContactInput;
  errors: ContactFieldErrors;
  disabled?: boolean;
  onChange: (patch: Partial<ContactImsContactInput>) => void;
};

/** Shared contact block for both Contact IMS forms. */
export function ContactFields({
  idPrefix,
  values,
  errors,
  disabled = false,
  onChange,
}: ContactFieldsProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Name"
          htmlFor={`${idPrefix}-name`}
          required
          error={errors.name}
        >
          <Input
            id={`${idPrefix}-name`}
            value={values.name}
            maxLength={20}
            disabled={disabled}
            autoComplete="name"
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </FormField>
        <FormField
          label="Email"
          htmlFor={`${idPrefix}-email`}
          required
          error={errors.email}
        >
          <Input
            id={`${idPrefix}-email`}
            type="email"
            value={values.email}
            maxLength={50}
            disabled={disabled}
            autoComplete="email"
            onChange={(event) => onChange({ email: event.target.value })}
          />
        </FormField>
        <FormField
          label="Job title"
          htmlFor={`${idPrefix}-job-title`}
          required
          error={errors.jobTitle}
        >
          <Input
            id={`${idPrefix}-job-title`}
            value={values.jobTitle}
            disabled={disabled}
            autoComplete="organization-title"
            onChange={(event) => onChange({ jobTitle: event.target.value })}
          />
        </FormField>
        <FormField
          label="Phone"
          htmlFor={`${idPrefix}-phone`}
          required
          error={errors.phone}
        >
          <Input
            id={`${idPrefix}-phone`}
            type="tel"
            value={values.phone}
            disabled={disabled}
            autoComplete="tel"
            onChange={(event) => onChange({ phone: event.target.value })}
          />
        </FormField>
      </div>
      <FormField
        label="Organisation name"
        htmlFor={`${idPrefix}-organisation`}
        required
        error={errors.organisationName}
      >
        <Input
          id={`${idPrefix}-organisation`}
          value={values.organisationName}
          disabled={disabled}
          autoComplete="organization"
          onChange={(event) =>
            onChange({ organisationName: event.target.value })
          }
        />
      </FormField>
    </>
  );
}

export const EMPTY_CONTACT: ContactImsContactInput = {
  name: "",
  email: "",
  jobTitle: "",
  phone: "",
  organisationName: "",
};

/** Collapse zod issues to first message per field. */
export function toFieldErrors(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>
): ContactFieldErrors {
  const next: ContactFieldErrors = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!next[key]) next[key] = issue.message;
  }
  return next;
}
