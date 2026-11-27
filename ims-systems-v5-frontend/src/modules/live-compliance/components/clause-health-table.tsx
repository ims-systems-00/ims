import { Link } from "react-router-dom";
import { StatusBadge } from "@/shared/components/status-badge";
import { LIVE_MODULE_NAMES, LIVE_MODULE_PATHS, type LiveClause } from "../types";
import { ClauseHealthChip } from "./clause-health-chip";

type Row = {
  clause: string;
  title: string;
  module: LiveClause["module"];
  live: boolean;
  entries: LiveClause[];
};

const RANK = { lapsed: 0, risk: 1, prog: 2, not: 3, impl: 4, sus: 5 } as const;

function toRows(clauses: LiveClause[]): Row[] {
  const map = new Map<string, Row>();
  for (const c of clauses) {
    const row = map.get(c.clause) ?? {
      clause: c.clause,
      title: c.title,
      module: c.module,
      live: c.live,
      entries: [],
    };
    row.entries.push(c);
    map.set(c.clause, row);
  }
  return [...map.values()].sort((a, b) =>
    a.clause.localeCompare(b.clause, undefined, { numeric: true })
  );
}

/** Every monitored clause, its standards, owning module, status and live evidence. */
export function ClauseHealthTable({ clauses }: { clauses: LiveClause[] }) {
  const rows = toRows(clauses);
  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle bg-card">
      <table className="w-full min-w-[720px] text-[0.8125rem]">
        <thead>
          <tr className="border-b border-border-subtle text-left text-[0.6875rem] uppercase tracking-[0.08em] text-muted-foreground">
            <th scope="col" className="px-3 py-2 font-medium">Clause</th>
            <th scope="col" className="px-3 py-2 font-medium">Requirement</th>
            <th scope="col" className="px-3 py-2 font-medium">Standards</th>
            <th scope="col" className="px-3 py-2 font-medium">Module</th>
            <th scope="col" className="px-3 py-2 font-medium">Status</th>
            <th scope="col" className="px-3 py-2 font-medium">Live evidence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const worst = [...row.entries].sort((a, b) => RANK[a.status] - RANK[b.status])[0]!;
            return (
              <tr key={row.clause} className="border-b border-border-subtle/60 last:border-0 align-top">
                <td className="px-3 py-2.5 font-semibold tabular-nums">{row.clause}</td>
                <td className="px-3 py-2.5">{row.title}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {row.entries.map((e) => (
                      <StatusBadge key={e.standard}>{e.standard.replace("ISO ", "")}</StatusBadge>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  {row.module ? (
                    <Link
                      to={LIVE_MODULE_PATHS[row.module]}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {LIVE_MODULE_NAMES[row.module]}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <ClauseHealthChip status={worst.status} />
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {worst.detail}
                  {!row.live ? <span className="ml-1 text-xs">(manual)</span> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
