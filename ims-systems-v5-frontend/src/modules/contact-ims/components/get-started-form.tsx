import { useState, type FormEvent } from "react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { getStartedFormSchema } from "../schemas";
import {
  CONTACT_IMS_ISO_STANDARDS,
  type ContactImsContactInput,
  type ContactImsIsoKey,
  type GetStartedInput,
} from "../types";
import {
  ContactFields,
  EMPTY_CONTACT,
  toFieldErrors,
  type ContactFieldErrors,
} from "./contact-fields";

type GetStartedFormProps = {
  pending?: boolean;
  onSubmit: (values: GetStartedInput) => Promise<void> | void;
};

const EMPTY_STANDARDS: Record<ContactImsIsoKey, boolean> = {
  iso27001: false,
  iso27002: false,
  iso20000: false,
  iso45001: false,
  iso9001: false,
  iso14001: false,
  iso22301: false,
};

/** Get Started enquiry — contact details, service, and ISO standards. */
export function GetStartedForm({
  pending = false,
  onSubmit,
}: GetStartedFormProps) {
  const [contact, setContact] = useState<ContactImsContactInput>(EMPTY_CONTACT);
  const [service, setService] = useState("");
  const [standards, setStandards] =
    useState<Record<ContactImsIsoKey, boolean>>(EMPTY_STANDARDS);
  const [errors, setErrors] = useState<ContactFieldErrors>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = getStartedFormSchema.safeParse({
      ...contact,
      service,
      ...standards,
    });
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    await onSubmit(parsed.data);
    setContact(EMPTY_CONTACT);
    setService("");
    setStandards(EMPTY_STANDARDS);
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
      <ContactFields
        idPrefix="get-started"
        values={contact}
        errors={errors}
        disabled={pending}
        onChange={(patch) => setContact((prev) => ({ ...prev, ...patch }))}
      />
      <FormField
        label="Service"
        htmlFor="get-started-service"
        required
        error={errors.service}
      >
        <Input
          id="get-started-service"
          value={service}
          disabled={pending}
          placeholder="Which iMS service are you interested in?"
          onChange={(event) => setService(event.target.value)}
        />
      </FormField>
      <fieldset className="space-y-2" disabled={pending}>
        <legend className="ims-text-label">Management standards</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {CONTACT_IMS_ISO_STANDARDS.map(({ key, label }) => (
            <label
              key={key}
              htmlFor={`get-started-${key}`}
              className="flex items-center gap-2 text-sm"
            >
              <input
                id={`get-started-${key}`}
                type="checkbox"
                checked={standards[key]}
                onChange={(event) =>
                  setStandards((prev) => ({
                    ...prev,
                    [key]: event.target.checked,
                  }))
                }
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Get started"}
        </Button>
      </div>
    </form>
  );
}
