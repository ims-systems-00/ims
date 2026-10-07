import { Link } from "react-router-dom";
import { Building2, Loader2 } from "lucide-react";
import { useFunctionalUnitsQuery } from "@/modules/functional-units/hooks/use-functional-units";

type UserBusinessUnitsCardProps = {
  groupIds: string[];
};

/**
 * Lists functional units the user belongs to (membership.groupIds).
 */
export function UserBusinessUnitsCard({ groupIds }: UserBusinessUnitsCardProps) {
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  const joined =
    unitsQuery.data?.items.filter((unit) => groupIds.includes(unit.id)) ?? [];

  return (
    <section className="ims-panel overflow-hidden">
      <div className="ims-panel-header">
        <h3 className="text-sm font-semibold tracking-tight">Business units</h3>
        <span className="ims-text-meta">
          {groupIds.length > 0 ? `${groupIds.length} joined` : "None"}
        </span>
      </div>
      <div className="space-y-3 px-4 py-4">
        {groupIds.length === 0 ? (
          <p className="ims-text-meta">
            This user is not assigned to any business unit yet.
          </p>
        ) : null}

        {groupIds.length > 0 && unitsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading business units…
          </div>
        ) : null}

        {groupIds.length > 0 && unitsQuery.isError ? (
          <ul className="space-y-2">
            {groupIds.map((id) => (
              <li
                key={id}
                className="flex items-center gap-2 rounded-sm border border-border-subtle px-3 py-2 text-sm"
              >
                <Building2 className="size-4 shrink-0 text-muted-foreground" />
                <span className="font-mono text-[0.75rem]">{id}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {joined.length > 0 ? (
          <ul className="space-y-2">
            {joined.map((unit) => (
              <li key={unit.id}>
                <Link
                  to={`/functional-units/${unit.id}`}
                  className="flex items-start gap-2.5 rounded-sm border border-border-subtle px-3 py-2.5 text-sm transition-colors hover:bg-surface-muted/50"
                >
                  <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground">
                      {unit.name}
                    </span>
                    <span className="ims-text-meta">
                      {unit.reference}
                      {unit.accessType ? ` · ${unit.accessType}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {groupIds.length > 0 &&
        unitsQuery.isSuccess &&
        joined.length === 0 ? (
          <p className="ims-text-meta">
            Assigned unit records could not be matched in the directory.
          </p>
        ) : null}
      </div>
    </section>
  );
}
