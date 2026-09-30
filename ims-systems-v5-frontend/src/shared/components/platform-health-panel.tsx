import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { getHealth } from "@/shared/api/health";
import { isApiClientError } from "@/shared/lib/http";
import { queryKeys } from "@/shared/lib/query/client";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/status-badge";

/**
 * Minimal platform probe — not a business dashboard.
 * Proves: React → TanStack Query → HTTP client → V5 API.
 */
export function PlatformHealthPanel() {
  const healthQuery = useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => getHealth(signal),
  });

  return (
    <section className="ims-panel">
      <div className="ims-panel-header">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" aria-hidden />
          <h2 className="ims-text-section">Platform health</h2>
        </div>
        {healthQuery.data ? (
          <StatusBadge
            tone={healthQuery.data.status === "ok" ? "success" : "warning"}
          >
            {healthQuery.data.status}
          </StatusBadge>
        ) : null}
      </div>

      <div className="px-4 py-3.5">
        {healthQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Checking API…</p>
        ) : null}

        {healthQuery.isError ? (
          <div className="space-y-3">
            <p className="ims-alert ims-alert-error" role="alert">
              {isApiClientError(healthQuery.error)
                ? `${healthQuery.error.code}: ${healthQuery.error.message}`
                : "Unable to reach the V5 API"}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void healthQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {healthQuery.data ? (
          <dl className="grid gap-2.5 text-[0.8125rem]">
            <div className="flex justify-between gap-4 border-b border-border-subtle pb-2.5">
              <dt className="text-muted-foreground">Database</dt>
              <dd className="font-medium tabular-nums">
                {healthQuery.data.checks.database}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
    </section>
  );
}
