import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/toast";
import { isApiClientError } from "@/shared/lib/http/errors";
import { INVITATION_ROLES, type InvitationRole } from "../types";
import { useCreateInvitationMutation } from "../hooks/use-invitations";

type InviteUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful invite (e.g. switch to the Invitations tab). */
  onInvited?: (email: string) => void;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_DESCRIPTIONS: Record<InvitationRole, string> = {
  "Super Admin": "Full access, including organisation settings and billing.",
  "Head of Service": "Manages services, teams and invitations.",
  Basic: "Standard member access.",
  Auditor: "Read-focused access for audits and evidence review.",
};

/**
 * "Add user" — invitation-based onboarding (no direct user creation).
 * The invitee receives an email link and becomes a member on acceptance.
 */
export function InviteUserDialog({
  open,
  onOpenChange,
  onInvited,
}: InviteUserDialogProps) {
  const inviteMutation = useCreateInvitationMutation();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitationRole>("Basic");
  const [emailError, setEmailError] = useState<string | null>(null);

  async function handleSubmit() {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      setEmailError("Enter a valid email address");
      return;
    }
    setEmailError(null);
    try {
      const created = await inviteMutation.mutateAsync({
        email: normalized,
        role,
      });
      notify.success(`${created.email} is invited to your organisation.`);
      setEmail("");
      setRole("Basic");
      onOpenChange(false);
      onInvited?.(created.email);
    } catch (error) {
      notify.error(
        isApiClientError(error)
          ? error.message
          : "Could not send the invitation. Please try again."
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Invite a person to join your organisation by email. They will
            become a member with the selected role once they accept.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Email" htmlFor="invite-email" error={emailError ?? undefined} required>
            <Input
              id="invite-email"
              type="email"
              placeholder="person@example.com"
              value={email}
              disabled={inviteMutation.isPending}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
            />
          </FormField>

          <FormField
            label="Role"
            htmlFor="invite-role"
            description={ROLE_DESCRIPTIONS[role]}
          >
            <select
              id="invite-role"
              className="ims-select"
              value={role}
              disabled={inviteMutation.isPending}
              onChange={(event) => setRole(event.target.value as InvitationRole)}
            >
              {INVITATION_ROLES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={inviteMutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={inviteMutation.isPending}
            onClick={() => void handleSubmit()}
          >
            {inviteMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <UserPlus className="size-3.5" />
            )}
            Send invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
