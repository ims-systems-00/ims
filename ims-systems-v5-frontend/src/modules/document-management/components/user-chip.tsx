import { UserAvatar } from "@/modules/users/components/user-avatar";
import { UserLabel } from "@/modules/users";

type UserChipProps = {
  userId: string;
  label?: string;
};

/**
 * Compact avatar + name for document owner / creator fields.
 */
export function UserChip({ userId, label }: UserChipProps) {
  const resolved = label?.trim();
  return (
    <span className="inline-flex items-center gap-2">
      <UserAvatar name={resolved || "User"} size="sm" />
      {resolved ? (
        <span className="text-[0.8125rem]">{resolved}</span>
      ) : (
        <UserLabel userId={userId} className="text-[0.8125rem]" />
      )}
    </span>
  );
}
