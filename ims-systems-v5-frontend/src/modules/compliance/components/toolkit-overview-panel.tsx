import type { ComplianceOverview } from "../types";
import { CompliancePercentBadge } from "./control-badges";

type ToolkitOverviewPanelProps = {
  overview: ComplianceOverview;
};

/**
 * Toolkit overview: overall % cards + section progress table.
 */
export function ToolkitOverviewPanel({ overview }: ToolkitOverviewPanelProps) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Overall compliance
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <OverviewStat
            label="Compliance Percentage"
            value={`${overview.totalPercentage}%`}
          />
          <OverviewStat
            label="Controls selected"
            value={String(overview.controlsSelected)}
          />
          <OverviewStat
            label="Controls implemented"
            value={String(overview.controlsImplemented)}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Section progress
        </h2>
        <div className="ims-table-wrap">
          <table className="ims-table min-w-0">
            <thead>
              <tr>
                <th>Section</th>
                <th>Progress</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {overview.sections.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No section progress available.
                  </td>
                </tr>
              ) : (
                overview.sections.map((section) => (
                  <tr key={section.section}>
                    <td>
                      <span className="tabular-nums tracking-tight text-muted-foreground">
                        {section.section}
                      </span>{" "}
                      <span className="font-medium">{section.title}</span>
                    </td>

                    <td>
                      <div
                        className="h-1.5 w-32 overflow-hidden rounded-full bg-surface-muted"
                        role="progressbar"
                        aria-valuenow={section.totalPercentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${section.section} progress`}
                      >
                        <div
                          className="h-full rounded-full bg-foreground/70"
                          style={{
                            width: `${Math.min(100, Math.max(0, section.totalPercentage))}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      <CompliancePercentBadge
                        value={section.totalPercentage}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function OverviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3.5 py-3">
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
    </div>
  );
}
