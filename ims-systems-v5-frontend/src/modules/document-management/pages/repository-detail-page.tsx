import { useParams } from "react-router-dom";
import { EmptyState } from "@/shared/components/empty-state";
import { RepositoryWorkspace } from "../components/repository-workspace";

/**
 * Repository detail — folder browser, upload, and soft-delete.
 */
export function RepositoryDetailPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <EmptyState
        title="Missing repository"
        description="No repository id was provided in the URL."
      />
    );
  }

  return <RepositoryWorkspace repositoryId={id} />;
}
