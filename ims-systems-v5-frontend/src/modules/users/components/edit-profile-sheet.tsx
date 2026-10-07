import { useEffect, useState, type FormEvent } from "react";
import { AppSheet } from "@/shared/components/app-sheet";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { useUpdateUserProfileMutation } from "../hooks/use-users";
import { editProfileFormSchema } from "../schemas";
import type { User } from "../types";

type EditProfileSheetProps = {
  open: boolean;
  user: User;
  onOpenChange: (open: boolean) => void;
};

/**
 * Self-service profile edit — first and last name only (Users spec).
 */
export function EditProfileSheet({
  open,
  user,
  onOpenChange,
}: EditProfileSheetProps) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useUpdateUserProfileMutation(user.id);

  useEffect(() => {
    if (!open) return;
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setErrors({});
  }, [open, user.firstName, user.lastName]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = editProfileFormSchema.safeParse({ firstName, lastName });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    try {
      await mutation.mutateAsync(parsed.data);
      notify.success("Profile updated");
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to update profile");
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Edit profile"
      description="Update the name shown across the organisation directory."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-profile-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <form
        id="edit-profile-form"
        className="space-y-4"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <FormField
          label="First name"
          htmlFor="edit-profile-first-name"
          required
          error={errors.firstName}
        >
          <input
            id="edit-profile-first-name"
            className="ims-field"
            value={firstName}
            disabled={mutation.isPending}
            autoComplete="given-name"
            onChange={(event) => setFirstName(event.target.value)}
          />
        </FormField>
        <FormField
          label="Last name"
          htmlFor="edit-profile-last-name"
          required
          error={errors.lastName}
        >
          <input
            id="edit-profile-last-name"
            className="ims-field"
            value={lastName}
            disabled={mutation.isPending}
            autoComplete="family-name"
            onChange={(event) => setLastName(event.target.value)}
          />
        </FormField>
      </form>
    </AppSheet>
  );
}
