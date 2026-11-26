import { useParams } from "react-router-dom";
import { AslCritBadge, AslStatusBadge } from "../components/asl-badges";
import { lastEval } from "../lib/asl-display";
import { useAslPublicSnapshotQuery } from "../hooks/use-asl-supplier";
import { PageLoader } from "@/shared/components/ims-loader";

/**
 * Read-only auditor share page (token-gated, no login).
 */
export function PublicAslSharePage() {
  const { token } = useParams<{ token: string }>();
  const snapshotQuery = useAslPublicSnapshotQuery(token);

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Supplier auditor pack
          </h1>
          <p className="text-sm text-muted-foreground">
            Read-only snapshot shared via secure link.
          </p>
        </div>

        {!token || snapshotQuery.isError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">
            This share link is invalid or has expired.
          </p>
        ) : snapshotQuery.isLoading || !snapshotQuery.data ? (
          <PageLoader label="Loading snapshot…" />
        ) : (
          <>
            <div className="rounded-xl border border-border-subtle bg-card p-4 text-sm">
              <p className="font-medium">{snapshotQuery.data.orgName}</p>
              <p className="text-muted-foreground">
                Generated {snapshotQuery.data.generatedAt.slice(0, 16)} ·{" "}
                {snapshotQuery.data.overview.totals.live} live suppliers
              </p>
            </div>

            <section className="overflow-x-auto rounded-xl border border-border-subtle bg-card">
              <table className="ims-table w-full text-sm">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Category</th>
                    <th>Criticality</th>
                    <th>Status</th>
                    <th>Last score</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshotQuery.data.suppliers
                    .filter((s) => s.status !== "Removed")
                    .map((s) => {
                      const last = lastEval(s);
                      return (
                        <tr key={s.id}>
                          <td className="font-medium">{s.name}</td>
                          <td>{s.cat}</td>
                          <td>
                            <AslCritBadge crit={s.crit} />
                          </td>
                          <td>
                            <AslStatusBadge status={s.status} />
                          </td>
                          <td>{last ? last.score.toFixed(1) : "—"}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </section>

            <section className="space-y-2 rounded-xl border border-border-subtle bg-card p-4">
              <h2 className="text-sm font-semibold">Audit readiness</h2>
              <ul className="space-y-2 text-sm">
                {snapshotQuery.data.overview.readiness.map((item) => (
                  <li key={item.label} className="flex gap-2">
                    <span
                      className={
                        item.pass
                          ? "mt-1.5 size-2 shrink-0 rounded-full bg-emerald-500"
                          : "mt-1.5 size-2 shrink-0 rounded-full bg-amber-500"
                      }
                    />
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-muted-foreground">
                        {item.detail} · {item.clause}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
