import { Navigate, useParams } from "react-router-dom";

/**
 * Deep-link compatibility: `/functional-units/:id` opens the list with the
 * view sheet for that unit. Normal interactions stay on `/functional-units`.
 */
export function FunctionalUnitDetailPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <Navigate to="/functional-units" replace />;
  }

  return (
    <Navigate to={`/functional-units?unit=${encodeURIComponent(id)}`} replace />
  );
}
