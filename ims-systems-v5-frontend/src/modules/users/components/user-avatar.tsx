import { cn } from "@/shared/lib/utils";

type UserAvatarProps = {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

const sizeClass = {
  sm: "size-8 text-[0.625rem]",
  md: "size-10 text-xs",
  lg: "size-12 text-sm",
} as const;

/**
 * Compact avatar with initials fallback — used in lists and detail headers.
 */
export function UserAvatar({
  name,
  imageUrl,
  size = "md",
  className,
}: UserAvatarProps) {
  const initials = initialsFromName(name);
  const hasImage = Boolean(imageUrl && !imageUrl.includes("avatar-placeholder"));

  if (hasImage) {
    return (
      <img
        src={imageUrl!}
        alt=""
        className={cn(
          "shrink-0 rounded-md object-cover",
          sizeClass[size],
          className
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border border-border bg-surface-muted font-semibold tracking-wide text-muted-foreground",
        sizeClass[size],
        className
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
