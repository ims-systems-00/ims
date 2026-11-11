import { useUserQuery } from "../hooks/use-users";

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

type UserLabelProps = {
  userId?: string | null;
  /** Optional truncation fallback while loading / if lookup fails. Prefer name. */
  fallback?: string;
  className?: string;
};

/**
 * Resolve a user id to a display name (never show a raw ObjectId as the label).
 */
export function UserLabel({
  userId,
  fallback = "Unknown user",
  className,
}: UserLabelProps) {
  const valid = Boolean(userId && OBJECT_ID_RE.test(userId));
  const query = useUserQuery(valid ? userId! : undefined, valid);

  if (!userId) return <span className={className}>—</span>;
  if (!valid) return <span className={className}>{userId}</span>;

  if (query.isLoading) {
    return <span className={className}>Loading…</span>;
  }

  const name = query.data?.user.name?.trim();
  const email = query.data?.user.email?.trim();
  const label = name || email || fallback;

  return (
    <span className={className} title={email || undefined}>
      {label}
    </span>
  );
}
