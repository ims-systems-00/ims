import { UserAvatar } from "@/modules/users/components/user-avatar";

type UserChipProps = {
  userId: string;
  label?: string;
};

/**
 * Compact avatar + name for document owner / creator fields.
 */
export function UserChip({ userId, label }: UserChipProps) {
  const name = label?.trim() || fallbackName(userId);
  return (
    <span className="inline-flex items-center gap-2">
      <UserAvatar name={name} size="sm" />
      <span className="text-[0.8125rem]">{name}</span>
    </span>
  );
}

function fallbackName(userId: string): string {
  if (userId === "dev-stub-user") return "Dev stub user";
  if (userId === "demo-seed") return "Demo seed";
  return userId.length > 12 ? `${userId.slice(0, 8)}…` : userId;
}
