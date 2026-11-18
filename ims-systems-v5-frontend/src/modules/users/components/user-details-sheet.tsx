import { useState } from "react";
import { useCurrentOrganisationQuery } from "@/modules/organisation/hooks/use-organisations";
import { AppSheet } from "@/shared/components/app-sheet";
import { Button } from "@/shared/components/ui/button";
import { useSessionUserQuery, useUserQuery } from "../hooks/use-users";
import { RemoveUserDialog } from "./remove-user-dialog";
import { UserDetailsContent } from "./user-details-content";

type UserDetailsSheetProps = {
  open: boolean;
  userId: string | null | undefined;
  onOpenChange: (open: boolean) => void;
  onRemoved?: () => void;
};

/**
 * Reusable right-side User Details sheet.
 * Opens from Users directory or Functional Units → All members.
 * Fetches authoritative classified data via Users API.
 */
export function UserDetailsSheet({
  open,
  userId,
  onOpenChange,
  onRemoved,
}: UserDetailsSheetProps) {
  const [removeOpen, setRemoveOpen] = useState(false);

  const detailQuery = useUserQuery(userId ?? undefined, open && Boolean(userId));
  const orgQuery = useCurrentOrganisationQuery();
  const sessionQuery = useSessionUserQuery();

  const actorRole = orgQuery.data?.membership?.role ?? null;
  const isSuperAdmin = actorRole === "Super Admin";
  const selfId = sessionQuery.data?.user.id;
  const user = detailQuery.data?.user;
  const membership = detailQuery.data?.membership;
  const isSelf = Boolean(user && selfId && user.id === selfId);
  const isTargetSuperAdmin = membership?.role === "Super Admin";

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title="User details"
        description="Organisation member profile and account information."
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {isSuperAdmin && user && !isSelf && !isTargetSuperAdmin ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setRemoveOpen(true)}
                >
                  Remove from organisation
                </Button>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        }
      >
        {userId ? (
          <UserDetailsContent userId={userId} enabled={open} />
        ) : null}
      </AppSheet>

      {user ? (
        <RemoveUserDialog
          open={removeOpen}
          onOpenChange={setRemoveOpen}
          userId={user.id}
          userName={user.name}
          userRole={membership?.role}
          onRemoved={() => {
            onOpenChange(false);
            onRemoved?.();
          }}
        />
      ) : null}
    </>
  );
}
