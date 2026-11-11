import { useFunctionalUnitQuery } from "../hooks/use-functional-units";

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

type BusinessUnitLabelProps = {
  id?: string | null;
  fallback?: string;
  className?: string;
};

/**
 * Resolve a functional / business unit id to its name.
 */
export function BusinessUnitLabel({
  id,
  fallback = "Unknown unit",
  className,
}: BusinessUnitLabelProps) {
  const valid = Boolean(id && OBJECT_ID_RE.test(id));
  const query = useFunctionalUnitQuery(valid ? id! : undefined);

  if (!id) return <span className={className}>—</span>;
  if (!valid) return <span className={className}>{id}</span>;

  if (query.isLoading) {
    return <span className={className}>Loading…</span>;
  }

  return (
    <span className={className}>{query.data?.name?.trim() || fallback}</span>
  );
}
