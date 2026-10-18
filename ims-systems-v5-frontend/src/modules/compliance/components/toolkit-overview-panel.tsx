import {
  CheckCircle2,
  CircleDashed,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { ComplianceOverview } from "../types";
import { CompliancePercentBadge } from "./control-badges";

type ToolkitOverviewPanelProps = {
  overview: ComplianceOverview;
  toolkitLabel: string;
  onBrowseControls?: () => void;
};

function progressTone(value: number): {
  bar: string;
  stroke: string;
} {
  if (value >= 100) {
    return { bar: "bg-success", stroke: "stroke-success" };
  }
  if (value >= 50) {
    return { bar: "bg-info", stroke: "stroke-info" };
  }
  if (value > 0) {
    return { bar: "bg-warning", stroke: "stroke-warning" };
  }
  return {
    bar: "bg-muted-foreground/40",
    stroke: "stroke-muted-foreground/50",
  };
}

/**
 * Toolkit overview: hero score + stats + section progress cards.
 */
export function ToolkitOverviewPanel({
  overview,
  toolkitLabel,
  onBrowseControls,
}: ToolkitOverviewPanelProps) {
  const pct = Math.min(100, Math.max(0, overview.totalPercentage));
  const tone = progressTone(pct);
  const selected = overview.controlsSelected;
  const implemented = overview.controlsImplemented;
  const remaining = Math.max(0, selected - implemented);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-xl border border-border-subtle bg-gradient-to-br from-primary/[0.07] via-surface to-surface px-5 py-5 sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 size-44 rounded-full bg-info/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle/80 bg-surface/80 px-2.5 py-1 text-[0.6875rem] font-medium text-muted-foreground backdrop-blur">
              <ShieldCheck className="size-3.5 text-primary" />
              {toolkitLabel}
            </div>
            <div>
              <p className="text-[0.75rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Overall compliance
              </p>
              <p className="mt-1 text-4xl font-semibold tracking-tight text-foreground tabular-nums">
                {pct}%
              </p>
            </div>
            <p className="max-w-xl text-[0.8125rem] leading-relaxed text-muted-foreground">
              {implemented} of {selected} selected controls implemented
              {remaining > 0 ? ` · ${remaining} remaining` : ""}.
            </p>
            {onBrowseControls ? (
              <button
                type="button"
                onClick={onBrowseControls}
                className="text-[0.8125rem] font-medium text-primary underline-offset-2 hover:underline"
              >
                Browse controls →
              </button>
            ) : null}
          </div>

          <div
            className="relative flex size-28 shrink-0 items-center justify-center sm:size-32"
            role="img"
            aria-label={`Overall compliance ${pct} percent`}
          >
            <svg viewBox="0 0 120 120" className="size-full -rotate-90">
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                strokeWidth="10"
                className="stroke-muted"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                className={cn(
                  "transition-[stroke-dashoffset] duration-500",
                  tone.stroke
                )}
                style={{
                  strokeDasharray: `${2 * Math.PI * 50}`,
                  strokeDashoffset: `${2 * Math.PI * 50 * (1 - pct / 100)}`,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold tabular-nums tracking-tight">
                {pct}%
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <OverviewStat
          icon={ShieldCheck}
          label="Compliance"
          value={`${pct}%`}
          hint="Across selected controls"
          tone="info"
        />
        <OverviewStat
          icon={ListChecks}
          label="Selected"
          value={String(selected)}
          hint="In scope for this toolkit"
          tone="neutral"
        />
        <OverviewStat
          icon={CheckCircle2}
          label="Implemented"
          value={String(implemented)}
          hint={
            remaining > 0
              ? `${remaining} still open`
              : selected > 0
                ? "All selected covered"
                : "Nothing selected yet"
          }
          tone={implemented > 0 && remaining === 0 ? "success" : "neutral"}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Section progress
          </h2>
          <p className="text-[0.75rem] text-muted-foreground">
            Implementation by clause group within this framework.
          </p>
        </div>

        {overview.sections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-subtle px-4 py-10 text-center text-[0.8125rem] text-muted-foreground">
            No section progress available yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {overview.sections.map((section) => {
              const sectionPct = Math.min(
                100,
                Math.max(0, section.totalPercentage)
              );
              const sectionTone = progressTone(sectionPct);
              return (
                <div
                  key={section.section}
                  className="rounded-xl border border-border-subtle bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[0.75rem] tabular-nums text-muted-foreground">
                        {section.section}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                        {section.title}
                      </p>
                    </div>
                    <CompliancePercentBadge value={sectionPct} />
                  </div>

                  <div className="mt-4 space-y-2">
                    <div
                      className="h-2 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={sectionPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${section.section} progress`}
                    >
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-300",
                          sectionTone.bar
                        )}
                        style={{ width: `${sectionPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[0.6875rem] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CircleDashed className="size-3" />
                        {section.controlsImplemented}/
                        {section.controlsSelected} implemented
                      </span>
                      <span>
                        {section.controlCount} control
                        {section.controlCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function OverviewStat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
  hint: string;
  tone: "neutral" | "info" | "success";
}) {
  const shell =
    tone === "success"
      ? "border-success/25 bg-success/10"
      : tone === "info"
        ? "border-info/25 bg-info/10"
        : "border-border-subtle bg-card";
  const iconShell =
    tone === "success"
      ? "bg-success/15 text-success"
      : tone === "info"
        ? "bg-info/15 text-info"
        : "bg-muted text-muted-foreground";

  return (
    <div className={cn("rounded-xl border px-4 py-3.5", shell)}>
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-lg",
            iconShell
          )}
        >
          <Icon className="size-4" />
        </div>
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {value}
        </p>
      </div>
      <p className="mt-3 text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-[0.75rem] text-muted-foreground">{hint}</p>
    </div>
  );
}
