import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useFunctionalUnitsQuery } from "@/modules/functional-units/hooks/use-functional-units";
import { useUserQuery } from "@/modules/users/hooks/use-users";
import type { BusinessPremise } from "../types";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Item({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="ims-text-meta">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}

function CreatorLabel({ userId }: { userId: string }) {
  const isObjectId = /^[a-fA-F0-9]{24}$/.test(userId);
  const query = useUserQuery(userId, isObjectId);
  if (!isObjectId) {
    return <span className="truncate">{userId}</span>;
  }
  if (query.isLoading) {
    return <span className="text-muted-foreground">Loading…</span>;
  }
  return (
    <span className="truncate">{query.data?.user.name ?? userId.slice(0, 8)}</span>
  );
}

type BusinessPremiseDetailsProps = {
  premise: BusinessPremise;
};

export function BusinessPremiseDetails({ premise }: BusinessPremiseDetailsProps) {
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });

  const linkedUnits = useMemo(() => {
    const byId = new Map(
      (unitsQuery.data?.items ?? []).map((unit) => [unit.id, unit])
    );
    return premise.functionalUnitIds.map((id) => ({
      id,
      name: byId.get(id)?.name ?? id.slice(0, 8),
      location: byId.get(id)?.operatingLocation,
    }));
  }, [premise.functionalUnitIds, unitsQuery.data]);

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Site
        </h3>
        <dl className="ims-detail-grid">
          <Item label="Name" value={premise.name} />
          <Item label="Location" value={premise.location} />
          <Item
            label="Address"
            value={
              <span className="whitespace-pre-wrap">{premise.address}</span>
            }
          />
          {premise.reference ? (
            <Item label="Reference" value={premise.reference} />
          ) : null}
        </dl>
      </section>

      <section className="space-y-2">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Functional units
        </h3>
        {linkedUnits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No units linked.</p>
        ) : (
          <ul className="space-y-2">
            {linkedUnits.map((unit) => (
              <li
                key={unit.id}
                className="rounded-sm border border-border-subtle px-3 py-2 text-sm"
              >
                <p className="font-medium">{unit.name}</p>
                {unit.location ? (
                  <p className="text-[0.75rem] text-muted-foreground">
                    {unit.location}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Record
        </h3>
        <dl className="ims-detail-grid">
          <Item
            label="Created by"
            value={<CreatorLabel userId={premise.createdBy} />}
          />
          <Item label="Created" value={formatDate(premise.createdOn)} />
          <Item label="Updated" value={formatDate(premise.updatedOn)} />
        </dl>
      </section>
    </div>
  );
}

export function BusinessPremiseDetailsLoading() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Loading Business Premise…
    </div>
  );
}
