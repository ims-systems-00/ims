import { AppSheet } from "@/shared/components/app-sheet";
import { Button } from "@/shared/components/ui/button";
import { UserDetailsContent } from "./user-details-content";

type UserDetailsSheetProps = {
  open: boolean;
  userId: string | null | undefined;
  onOpenChange: (open: boolean) => void;
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
}: UserDetailsSheetProps) {
  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="User details"
      description="Organisation member profile and account information."
      footer={
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      {userId ? (
        <UserDetailsContent userId={userId} enabled={open} />
      ) : null}
    </AppSheet>
  );
}
