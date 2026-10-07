import { useTagAndCategoryQuery } from "../hooks/use-tags-and-categories";

type CategoryLabelProps = {
  categoryId?: string | null;
  /** Prefixed detail display, e.g. "Category: Strategic". */
  showPrefix?: boolean;
  empty?: string;
};

/**
 * Resolves a stored categoryId to a readable name for detail views.
 */
export function CategoryLabel({
  categoryId,
  showPrefix = true,
  empty = "—",
}: CategoryLabelProps) {
  const query = useTagAndCategoryQuery(
    categoryId ?? undefined,
    Boolean(categoryId)
  );

  if (!categoryId) {
    return <>{empty}</>;
  }

  if (query.isLoading) {
    return <span className="text-muted-foreground">Loading…</span>;
  }

  const name = query.data?.name ?? categoryId;
  return <>{showPrefix ? `Category: ${name}` : name}</>;
}
