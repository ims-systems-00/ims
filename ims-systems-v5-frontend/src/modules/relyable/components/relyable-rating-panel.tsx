import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/status-badge";
import { isApiClientError } from "@/shared/lib/http/errors";
import { cn } from "@/shared/lib/utils";
import {
  useRelyableDashboardQuery,
  useSyncRelyableMutation,
} from "../hooks/use-relyable";
import type { RelyableDashboard, RelyableModuleContribution } from "../types";

const MODULE_HREF: Record<string, string> = {
  documents: "/document-management",
  training: "/training",
  inventory: "/inventory",
  suppliers: "/suppliers",
  incidents: "/incidents",
  audits: "/audits",
};

function bandTone(
  band: string
): "success" | "info" | "warning" | "destructive" | "neutral" {
  if (band === "A" || band === "B") return "success";
  if (band === "C") return "info";
  if (band === "D") return "warning";
  if (band === "E") return "destructive";
  return "neutral";
}

/** Gauge stroke follows band semantics using theme CSS variables. */
function bandStrokeVars(band: string): { from: string; to: string } {
  if (band === "A" || band === "B") {
    return { from: "var(--success)", to: "var(--primary)" };
  }
  if (band === "C") {
    return { from: "var(--info)", to: "var(--primary)" };
  }
  if (band === "D") {
    return { from: "var(--warning)", to: "var(--primary)" };
  }
  if (band === "E") {
    return { from: "var(--destructive)", to: "var(--primary)" };
  }
  return { from: "var(--primary)", to: "var(--sidebar)" };
}

function moduleBarClass(mod: RelyableModuleContribution): string {
  if (mod.max <= 0) return "bg-border";
  const ratio = mod.points / mod.max;
  if (ratio >= 0.95) return "bg-success";
  if (ratio >= 0.7) return "bg-primary";
  return "bg-warning";
}

function moduleLabel(id: string): string {
  switch (id) {
    case "documents":
      return "Documents";
    case "training":
      return "Training";
    case "inventory":
      return "Inventory";
    case "suppliers":
      return "Suppliers";
    case "incidents":
      return "Incidents";
    case "audits":
      return "Audits & reviews";
    default:
      return "Public record";
  }
}

function formatComputed(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

function routeForEvidenceType(type: string): string {
  if (type.startsWith("asset.") || type.startsWith("fleet.")) return "/inventory";
  if (type.startsWith("training.")) return "/training";
  if (type.startsWith("supplier.") || type === "cert.ssip") return "/suppliers";
  if (
    type.startsWith("safety.") ||
    type.startsWith("fire.") ||
    type.startsWith("food.")
  ) {
    return "/incidents";
  }
  if (type.startsWith("gov.") || type.startsWith("infosec.")) return "/audits";
  return MODULE_HREF.documents ?? "/document-management";
}

function Gauge({ rating, band }: { rating: number; band: string }) {
  const pct = Math.max(0, Math.min(100, rating / 10));
  const r = 58;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const { from, to } = bandStrokeVars(band);
  const id = `rly-gauge-${band}`;

  return (
    <div className="relative mx-auto h-[11rem] w-[11rem]">
      <div
        className="pointer-events-none absolute inset-[16%] rounded-full bg-gradient-to-b from-surface to-surface-muted shadow-inner ring-1 ring-border-subtle"
        aria-hidden
      />
      <svg
        viewBox="0 0 140 140"
        className="relative h-full w-full -rotate-90"
        aria-hidden
      >
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth="10"
        />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
          style={{
            filter:
              "drop-shadow(0 2px 6px color-mix(in oklch, var(--primary) 28%, transparent))",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[2.35rem] font-semibold leading-none tracking-tight text-foreground tabular-nums">
          {rating}
        </span>
        <span className="mt-1.5 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          of 1,000
        </span>
      </div>
    </div>
  );
}

function ModuleRows({ modules }: { modules: RelyableModuleContribution[] }) {
  const rows = modules.filter((m) => m.max > 0 || m.id === "registry");
  return (
    <ul className="space-y-3.5">
      {rows.map((mod) => {
        const pct = mod.max > 0 ? Math.round((mod.points / mod.max) * 100) : 0;
        return (
          <li key={mod.id} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[0.8125rem] font-medium text-foreground">
                {moduleLabel(mod.id)}
              </span>
              <span className="shrink-0 text-[0.75rem] tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{mod.points}</span>
                <span className="text-muted-foreground/50"> / {mod.max}</span>
                <span className="ml-1.5 text-muted-foreground/45">
                  ({mod.share}%)
                </span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted ring-1 ring-inset ring-border-subtle">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  moduleBarClass(mod)
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RaiseList({ data }: { data: RelyableDashboard }) {
  const items = data.raiseIt.slice(0, 3);
  if (!items.length) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-surface-muted/40 px-3 py-4 text-[0.8125rem] leading-relaxed text-muted-foreground">
        No immediate raise actions — keep evidence current.
      </p>
    );
  }
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={`${item.type}-${item.level}`}>
          <Link
            to={routeForEvidenceType(item.type)}
            className={cn(
              "group flex items-start gap-3 rounded-lg border border-border bg-surface px-3.5 py-3",
              "shadow-[var(--shadow-xs)] transition-all duration-200",
              "hover:border-primary/30 hover:bg-accent/50 hover:shadow-[var(--shadow-sm)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            )}
          >
            <span
              className={cn(
                "mt-0.5 inline-flex min-w-[2.75rem] shrink-0 items-center justify-center rounded-md px-1.5 py-1",
                "text-sm font-semibold tabular-nums",
                item.afterCap
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
              )}
            >
              +{item.delta}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.8125rem] font-medium leading-snug text-foreground">
                {item.label}
              </span>
              <span className="mt-1.5 inline-flex items-center gap-1 text-[0.75rem] font-medium text-primary opacity-80 transition-opacity group-hover:opacity-100">
                Open module
                <ArrowUpRight className="size-3.5" aria-hidden />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PanelChrome({
  children,
  actions,
  subtitle,
}: {
  children: ReactNode;
  actions?: ReactNode;
  subtitle?: string;
}) {
  return (
    <section
      className={cn(
        "relative col-span-12 overflow-hidden rounded-xl border border-border",
        "bg-surface shadow-[var(--shadow-md)] ring-1 ring-border-subtle"
      )}
      aria-label="Relyable rating"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 70% at 0% 0%, color-mix(in oklch, var(--primary) 10%, transparent), transparent 55%), radial-gradient(80% 60% at 100% 0%, color-mix(in oklch, var(--secondary) 35%, transparent), transparent 50%), linear-gradient(180deg, color-mix(in oklch, var(--accent) 70%, transparent), transparent 45%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent"
        aria-hidden
      />

      <header className="relative flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-sm)]">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[0.8125rem] font-semibold uppercase tracking-[0.1em] text-foreground">
                Relyable rating
              </h2>
              <StatusBadge tone="success">
                <span className="mr-1.5 inline-block size-1.5 rounded-full bg-success" />
                Live
              </StatusBadge>
              {subtitle ? (
                <span className="rounded-md border border-border bg-surface/80 px-2 py-0.5 text-[0.6875rem] text-muted-foreground">
                  {subtitle}
                </span>
              ) : null}
            </div>
            <p className="max-w-xl text-[0.8125rem] leading-relaxed text-muted-foreground">
              Trust score from module evidence and public registers — re-rated
              as evidence changes.
            </p>
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </header>
      <div className="relative">{children}</div>
    </section>
  );
}

export function RelyableRatingPanel() {
  const query = useRelyableDashboardQuery();
  const sync = useSyncRelyableMutation();

  const onSync = async () => {
    try {
      const result = await sync.mutateAsync();
      toast.success(
        `Synced — rating ${result.dashboard.rating} (${result.emitted} new)`
      );
    } catch (error) {
      toast.error(
        isApiClientError(error)
          ? error.message
          : "Unable to sync Relyable rating"
      );
    }
  };

  const syncButton = (
    <Button
      type="button"
      size="sm"
      disabled={sync.isPending}
      onClick={() => {
        void onSync();
      }}
      title="Push module evidence and recompute the Relyable score"
    >
      <RefreshCw
        className={sync.isPending ? "animate-spin" : undefined}
        aria-hidden
      />
      Sync
    </Button>
  );

  if (query.isLoading) {
    return (
      <section
        className="col-span-12 h-64 animate-pulse rounded-xl border border-border bg-surface-muted shadow-[var(--shadow-md)] ring-1 ring-border-subtle"
        aria-busy="true"
        aria-label="Loading Relyable rating"
      />
    );
  }

  if (query.isError) {
    return (
      <PanelChrome actions={syncButton}>
        <div className="flex items-start gap-3 px-5 py-8 sm:px-6" role="alert">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground shadow-[var(--shadow-xs)]">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              Rating unavailable
            </p>
            <p className="mt-1 max-w-lg text-[0.8125rem] leading-relaxed text-muted-foreground">
              {isApiClientError(query.error)
                ? query.error.message
                : "Unable to load Relyable rating. Sync to initialise."}
            </p>
          </div>
        </div>
      </PanelChrome>
    );
  }

  const data = query.data!;
  const cap = data.caps.find((c) => c.limit != null);
  const nextExpiry = data.nextRisks.find((r) => r.what === "expires");
  const weekUp = (data.weekDelta ?? 0) > 0;
  const tone = bandTone(data.band);

  return (
    <PanelChrome
      subtitle={`Standard v${data.modelVersion}`}
      actions={syncButton}
    >
      <div className="grid gap-0 lg:grid-cols-[16.5rem_minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Score */}
        <div className="flex flex-col items-center border-b border-border-subtle px-5 py-6 text-center sm:px-6 lg:border-b-0 lg:border-r">
          <Gauge rating={data.rating} band={data.band} />

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[0.8125rem] font-semibold shadow-[var(--shadow-xs)]",
                tone === "success" &&
                  "border-success/20 bg-success text-success-foreground",
                tone === "info" && "border-info/20 bg-info text-info-foreground",
                tone === "warning" &&
                  "border-warning/25 bg-warning text-warning-foreground",
                tone === "destructive" &&
                  "border-destructive/20 bg-destructive text-destructive-foreground",
                tone === "neutral" &&
                  "border-border bg-surface-muted text-muted-foreground"
              )}
            >
              <span className="inline-flex size-6 items-center justify-center rounded-md bg-white/20 text-[0.8125rem] font-bold">
                {data.band}
              </span>
              {data.bandName}
            </span>
            <StatusBadge tone="neutral">Tier {data.tier}</StatusBadge>
          </div>

          <div className="mt-5 w-full space-y-2 rounded-xl border border-border bg-surface/90 p-3.5 text-left shadow-[var(--shadow-xs)]">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Verified
              </span>
              <span className="text-[0.8125rem] font-semibold tabular-nums text-foreground">
                {data.verifiedRatio}%
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2 border-t border-border-subtle pt-2">
              <span className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Scope
              </span>
              <span className="truncate text-[0.8125rem] capitalize text-foreground">
                {data.scope.family} · {data.scope.sizeBand}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2 border-t border-border-subtle pt-2">
              <span className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Computed
              </span>
              <span className="text-[0.8125rem] text-foreground">
                {formatComputed(data.computedAt)}
              </span>
            </div>
          </div>

          {data.weekDelta != null && data.weekDelta !== 0 ? (
            <p
              className={cn(
                "mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.75rem] font-semibold",
                weekUp
                  ? "border-success/20 bg-success/10 text-success"
                  : "border-destructive/20 bg-destructive/10 text-destructive"
              )}
            >
              {weekUp ? (
                <TrendingUp className="size-3.5" aria-hidden />
              ) : (
                <TrendingDown className="size-3.5" aria-hidden />
              )}
              {weekUp ? "+" : ""}
              {data.weekDelta} this week
            </p>
          ) : null}

          {cap ? (
            <p className="mt-3 w-full rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2 text-left text-[0.75rem] leading-snug text-destructive">
              Capped at {cap.limit}: {cap.reason}
            </p>
          ) : null}
        </div>

        {/* Modules */}
        <div className="border-b border-border-subtle px-5 py-6 sm:px-6 lg:border-b-0 lg:border-r">
          <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            What each module contributes
          </h3>
          <div className="mt-5">
            <ModuleRows modules={data.modules} />
          </div>
          <div className="mt-6 space-y-3 border-t border-border-subtle pt-4">
            <p className="text-[0.75rem] text-muted-foreground">
              Risk indicators:{" "}
              <span className="font-semibold text-foreground">
                {data.riskIndicators.clear} of {data.riskIndicators.total} clear
              </span>
            </p>
            {data.listedCertifications.length ? (
              <div className="flex flex-wrap gap-1.5">
                {data.listedCertifications.map((cert) => (
                  <span
                    key={cert}
                    className="rounded-md border border-border bg-surface px-2 py-0.5 text-[0.6875rem] font-medium text-foreground shadow-[var(--shadow-xs)]"
                  >
                    {cert}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="text-[0.75rem] text-muted-foreground">
              {data.lastSyncedAt
                ? `Last sync ${formatComputed(data.lastSyncedAt)}`
                : "Not synced yet — use Sync to push evidence."}
            </p>
          </div>
        </div>

        {/* Raise */}
        <div className="px-5 py-6 sm:px-6">
          <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            What would raise it
          </h3>
          <div className="mt-5">
            <RaiseList data={data} />
          </div>
          {nextExpiry ? (
            <p className="mt-4 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2.5 text-[0.75rem] text-warning-foreground">
              Next expiry:{" "}
              <span className="font-semibold">{nextExpiry.label}</span>
              <span className="text-muted-foreground">
                {" "}
                · {Math.max(0, nextExpiry.in)} days
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </PanelChrome>
  );
}
