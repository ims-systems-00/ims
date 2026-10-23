import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Blocks,
  Building2,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Handshake,
  Link2,
  Network,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { PageHeader } from "@/shared/layout";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { usePartnerDashboardQuery } from "../hooks/use-partnerships";
import { formatDate } from "@/shared/lib/format-date";

type StatDefinition = {
  label: string;
  value: number;
  hint: string;
  icon: ReactNode;
  iconClass: string;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function StatCard({ stat, featured = false }: { stat: StatDefinition; featured?: boolean }) {
  return (
    <div
      className={cn(
        "group rounded-xl border px-4 py-4 transition-all duration-200 hover:-translate-y-0.5",
        featured
          ? "border-primary/25 bg-primary/[0.05] shadow-sm ring-1 ring-primary/10 hover:shadow-md"
          : "border-border bg-surface shadow-sm ring-1 ring-border-subtle hover:bg-accent/25 hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.07em] text-muted-foreground">
          {stat.label}
        </p>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 [&_svg]:size-4",
            stat.iconClass
          )}
          aria-hidden
        >
          {stat.icon}
        </span>
      </div>
      <p className="mt-2 text-[1.75rem] font-semibold leading-none tabular-nums tracking-tight text-foreground">
        {stat.value.toLocaleString()}
      </p>
      <p className="mt-2 text-[0.6875rem] leading-snug text-muted-foreground">
        {stat.hint}
      </p>
    </div>
  );
}

function CopyButton({
  value,
  label,
  copiedKey,
  copyKey,
  onCopied,
  dark = false,
}: {
  value: string;
  label: string;
  copiedKey: string | null;
  copyKey: string;
  onCopied: (key: string) => void;
  dark?: boolean;
}) {
  const copied = copiedKey === copyKey;
  return (
    <Button
      type="button"
      size="sm"
      variant={dark ? "secondary" : "outline"}
      className={cn(dark && "bg-white/15 text-white shadow-none hover:bg-white/25 dark:bg-white/15 dark:hover:bg-white/25")}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          onCopied(copyKey);
          notify.success(`${label} copied`);
        } catch {
          notify.error(`Unable to copy ${label.toLowerCase()}`);
        }
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading partner dashboard">
      <div className="h-52 animate-pulse rounded-xl bg-muted/60" />
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
        <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
      </div>
      <span className="sr-only">Loading partner dashboard…</span>
    </div>
  );
}

/**
 * Partner dashboard: referral code/link, aggregate analytics, and the
 * organisations that signed up with the partner code.
 */
export function PartnerDashboardPage() {
  const dashboardQuery = usePartnerDashboardQuery();
  const dashboard = dashboardQuery.data;
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedKey) return;
    const handle = window.setTimeout(() => setCopiedKey(null), 2_000);
    return () => window.clearTimeout(handle);
  }, [copiedKey]);

  const customerCount =
    dashboard?.organisations.filter((org) => org.isCustomer).length ?? 0;
  const maxToolkitCount = Math.max(
    1,
    ...(dashboard?.complianceBreakdown.map((row) => row.count) ?? [1])
  );

  const stats: StatDefinition[] = dashboard
    ? [
        {
          label: "Organisations",
          value: dashboard.stats.organisations,
          hint: `${customerCount} converted to customer${customerCount === 1 ? "" : "s"}`,
          icon: <Building2 />,
          iconClass: "bg-primary/10 text-primary",
        },
        {
          label: "Business units",
          value: dashboard.stats.groups,
          hint: "Groups across referred organisations",
          icon: <Network />,
          iconClass: "bg-info/12 text-info",
        },
        {
          label: "Users",
          value: dashboard.stats.users,
          hint: "Licensed users across referrals",
          icon: <Users />,
          iconClass: "bg-success/12 text-success",
        },
        {
          label: "Super users",
          value: dashboard.stats.superUsers,
          hint: "Admin seats across referrals",
          icon: <ShieldCheck />,
          iconClass: "bg-warning/18 text-warning-foreground",
        },
        {
          label: "CRM modules",
          value: dashboard.stats.crmModules,
          hint: "Referrals with CRM enabled",
          icon: <Blocks />,
          iconClass: "bg-primary/10 text-primary",
        },
      ]
    : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Partner programme"
        description="Your referral code, signup link, and the organisations you've referred to iMS."
      />

      {dashboardQuery.isPending ? (
        <LoadingSkeleton />
      ) : dashboardQuery.isError || !dashboard ? (
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-surface to-info/[0.07] px-6 py-10 shadow-sm ring-1 ring-border-subtle">
          <div
            className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full border-[2rem] border-primary/[0.06]"
            aria-hidden
          />
          <EmptyState
            className="relative border-0 bg-transparent p-0 shadow-none"
            title="You are not an iMS Systems partner"
            description="Join the partner programme to receive a referral code, a shareable signup link, and live tracking of every organisation you refer."
            icon={<Handshake className="size-4" />}
            action={
              <Button asChild>
                <Link to="/onboard/partner">
                  <Sparkles className="size-4" />
                  Become a partner
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* ── Hero / share card ─────────────────────────────── */}
          <section className="relative overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-md">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/18 via-transparent to-black/18"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full border-[2.5rem] border-white/10"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-28 right-40 size-56 rounded-full bg-white/[0.07] blur-2xl"
              aria-hidden
            />

            <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.07em]">
                    <Award className="size-3.5" aria-hidden />
                    Official partner
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/15 px-2.5 py-1 text-[0.6875rem] font-medium">
                    <span className="size-1.5 rounded-full bg-emerald-300" aria-hidden />
                    {dashboard.partnership.status}
                  </span>
                </div>

                <h2 className="mt-4 text-2xl text-white font-semibold tracking-tight sm:text-[1.75rem]">
                  Grow iMS, one referral at a time.
                </h2>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-primary-foreground/80">
                  Share your signup link or partner code. Every organisation
                  that joins through you appears below, with its licences and
                  toolkits.
                </p>

                <p className="mt-5 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-primary-foreground/70">
                  Partner code
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <code className="rounded-lg border border-white/25 bg-black/20 px-3 py-1.5 font-mono text-base font-semibold tracking-wide">
                    {dashboard.partnerCode}
                  </code>
                  <CopyButton
                    dark
                    value={dashboard.partnerCode}
                    label="Partner code"
                    copyKey="code"
                    copiedKey={copiedKey}
                    onCopied={setCopiedKey}
                  />
                </div>
              </div>

              <div className="flex flex-col justify-end">
                <div className="rounded-xl border border-white/20 bg-black/15 p-4 backdrop-blur-sm">
                  <p className="flex items-center gap-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-primary-foreground/70">
                    <Link2 className="size-3.5" aria-hidden />
                    Your signup link
                  </p>
                  <code className="mt-2 block truncate rounded-lg border border-white/15 bg-white/10 px-3 py-2 font-mono text-[0.75rem] text-primary-foreground">
                    {dashboard.signupUrl}
                  </code>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <CopyButton
                      dark
                      value={dashboard.signupUrl}
                      label="Signup link"
                      copyKey="link"
                      copiedKey={copiedKey}
                      onCopied={setCopiedKey}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="bg-white text-primary shadow-none hover:bg-white/90"
                      asChild
                    >
                      <a href={dashboard.signupUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-3.5" />
                        Open link
                      </a>
                    </Button>
                    <span className="ml-auto hidden items-center gap-1.5 text-[0.6875rem] text-primary-foreground/70 sm:inline-flex">
                      <Share2 className="size-3.5" aria-hidden />
                      Partner since {formatDate(dashboard.partnership.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Stats ─────────────────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {stats.map((stat, index) => (
              <StatCard key={stat.label} stat={stat} featured={index === 0} />
            ))}
          </div>

          {/* ── Toolkits + partnership details ────────────────── */}
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm ring-1 ring-border-subtle">
              <div className="ims-panel-header">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">
                    Compliance toolkits across referrals
                  </h3>
                  <p className="mt-0.5 text-[0.75rem] text-muted-foreground">
                    Adoption across the organisations you referred.
                  </p>
                </div>
              </div>
              {dashboard.complianceBreakdown.length === 0 ? (
                <p className="px-4 py-6 text-[0.8125rem] leading-relaxed text-muted-foreground">
                  No compliance toolkits yet. They will appear here as your
                  referred organisations go live.
                </p>
              ) : (
                <ul className="space-y-3.5 px-4 py-4">
                  {dashboard.complianceBreakdown.map((row) => (
                    <li key={row.toolkit}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[0.8125rem] font-medium text-foreground">
                          {row.toolkit}
                        </span>
                        <span className="text-[0.75rem] tabular-nums text-muted-foreground">
                          {row.toolkit} · {row.count}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/80 transition-[width] duration-500"
                          style={{
                            width: `${Math.max(6, Math.round((row.count / maxToolkitCount) * 100))}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm ring-1 ring-border-subtle">
              <div className="ims-panel-header">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">
                    Your partnership
                  </h3>
                  <p className="mt-0.5 text-[0.75rem] text-muted-foreground">
                    The profile you applied with.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-[0.6875rem] font-medium text-success">
                  <span className="size-1.5 rounded-full bg-success" aria-hidden />
                  {dashboard.partnership.status}
                </span>
              </div>
              <dl className="divide-y divide-border-subtle px-4">
                {[
                  { label: "Service provision", value: dashboard.partnership.serviceProvision },
                  { label: "Standards", value: dashboard.partnership.standards },
                  {
                    label: "Customer reach",
                    value: `${dashboard.partnership.customerReach.toLocaleString()} organisations`,
                  },
                  { label: "Partner since", value: formatDate(dashboard.partnership.createdAt) },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 py-3"
                  >
                    <dt className="text-[0.75rem] font-medium uppercase tracking-[0.05em] text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd className="truncate text-[0.8125rem] text-foreground" title={row.value}>
                      {row.value}
                    </dd>
                  </div>
                ))}
                <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 py-3">
                  <dt className="text-[0.75rem] font-medium uppercase tracking-[0.05em] text-muted-foreground">
                    Website
                  </dt>
                  <dd className="truncate text-[0.8125rem]">
                    <a
                      href={dashboard.partnership.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                    >
                      <Globe className="size-3.5" aria-hidden />
                      <span className="truncate">{dashboard.partnership.website}</span>
                    </a>
                  </dd>
                </div>
              </dl>
              {dashboard.partnership.description ? (
                <p className="border-t border-border-subtle px-4 py-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
                  {dashboard.partnership.description}
                </p>
              ) : null}
            </section>
          </div>

          {/* ── Referred organisations ────────────────────────── */}
          <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm ring-1 ring-border-subtle">
            <div className="ims-panel-header">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">
                  Referred organisations
                </h3>
                <p className="mt-0.5 text-[0.75rem] text-muted-foreground">
                  Organisations that signed up with your partner code.
                </p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-[0.6875rem] font-medium tabular-nums text-muted-foreground">
                {dashboard.organisations.length} total
              </span>
            </div>

            {dashboard.organisations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Share2 className="size-5" aria-hidden />
                </span>
                <p className="text-sm font-medium text-foreground">
                  No referrals yet
                </p>
                <p className="max-w-sm text-[0.8125rem] leading-relaxed text-muted-foreground">
                  Share your signup link above — referred organisations and
                  their licences will be tracked here automatically.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border-subtle">
                {dashboard.organisations.map((org) => (
                  <li
                    key={org.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-accent/25"
                  >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[0.75rem] font-semibold text-primary"
                      aria-hidden
                    >
                      {initials(org.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[0.8125rem] font-medium text-foreground">
                        {org.name}
                      </p>
                      <p className="text-[0.75rem] text-muted-foreground">
                        Joined {formatDate(org.createdAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[0.6875rem] font-medium",
                        org.isCustomer
                          ? "bg-success/12 text-success"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {org.isCustomer ? "Customer" : "Signed up"}
                    </span>

                    <div className="ml-auto flex flex-wrap gap-1.5">
                      {[
                        `SA ${org.superUser.allocated}`,
                        `Users ${org.users.allocated}`,
                        `BU ${org.groups.allocated}`,
                        `${org.complianceTools.length} toolkit${org.complianceTools.length === 1 ? "" : "s"}`,
                        ...(org.additionalModules.includes("CRM") ? ["CRM"] : []),
                      ].map((chip) => (
                        <span
                          key={chip}
                          className="rounded-md border border-border-subtle bg-muted/35 px-2 py-0.5 text-[0.6875rem] tabular-nums text-muted-foreground"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
