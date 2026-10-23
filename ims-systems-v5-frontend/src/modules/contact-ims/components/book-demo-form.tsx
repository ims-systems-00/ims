import { useState, type FormEvent } from "react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { bookDateFormSchema } from "../schemas";
import type { BookDateInput, ContactImsContactInput } from "../types";
import {
  ContactFields,
  EMPTY_CONTACT,
  toFieldErrors,
  type ContactFieldErrors,
} from "./contact-fields";

type BookDemoFormProps = {
  pending?: boolean;
  /** Dates returned by GET /contact-ims/booked-dates (currently always empty). */
  bookedDates?: string[];
  onSubmit: (values: BookDateInput) => Promise<void> | void;
};

/** Demo booking request — contact details + preferred date. */
export function BookDemoForm({
  pending = false,
  bookedDates = [],
  onSubmit,
}: BookDemoFormProps) {
  const [contact, setContact] = useState<ContactImsContactInput>(EMPTY_CONTACT);
  const [bookedDate, setBookedDate] = useState("");
  const [additionalInformation, setAdditionalInformation] = useState("");
  const [errors, setErrors] = useState<ContactFieldErrors>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = bookDateFormSchema.safeParse({
      ...contact,
      bookedDate,
      additionalInformation,
    });
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error.issues));
      return;
    }
    if (bookedDates.includes(parsed.data.bookedDate)) {
      setErrors({ bookedDate: "This date is unavailable" });
      return;
    }
    setErrors({});
    await onSubmit({
      ...parsed.data,
      additionalInformation: parsed.data.additionalInformation || undefined,
    });
    setContact(EMPTY_CONTACT);
    setBookedDate("");
    setAdditionalInformation("");
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
      <ContactFields
        idPrefix="book-demo"
        values={contact}
        errors={errors}
        disabled={pending}
        onChange={(patch) => setContact((prev) => ({ ...prev, ...patch }))}
      />
      <FormField
        label="Preferred demo date"
        htmlFor="book-demo-date"
        required
        error={errors.bookedDate}
        description="A representative will contact you to schedule a time that suits you."
      >
        <Input
          id="book-demo-date"
          type="date"
          value={bookedDate}
          disabled={pending}
          onChange={(event) => setBookedDate(event.target.value)}
        />
      </FormField>
      <FormField
        label="Additional information"
        htmlFor="book-demo-additional"
        error={errors.additionalInformation}
      >
        <Textarea
          id="book-demo-additional"
          className="min-h-24"
          value={additionalInformation}
          disabled={pending}
          onChange={(event) => setAdditionalInformation(event.target.value)}
        />
      </FormField>
      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Book a demo"}
        </Button>
      </div>
    </form>
  );
}
