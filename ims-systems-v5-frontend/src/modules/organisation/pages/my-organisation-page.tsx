import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Building2, Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/layout";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import { useCurrentOrganisationQuery } from "../hooks/use-organisations";
import type { OrganisationProfile } from "../types";

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <dt className="ims-detail-label">{label}</dt>
      <dd className="ims-detail-value break-words">{value ?? "—"}</dd>
    </div>
  );
}

function OrgCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="ims-panel overflow-hidden">
      <div className="ims-panel-header">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {action}
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function formatAddress(address: OrganisationProfile["address"]): string {
  return [
    address.line1,
    address.line2,
    address.city,
    address.county,
    address.postCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * My organisation — session tenant profile from GET /organisations/current.
 */
export function MyOrganisationPage() {
  const orgQuery = useCurrentOrganisationQuery();
  const membersQuery = useUsersQuery({ page: 1, pageSize: 1 });

  if (orgQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <PageHeader
          title="My organisation"
          description="Tenant identity and contact details for the organisation in this session."
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading organisation…
        </div>
      </div>
    );
  }

  if (orgQuery.isError || !orgQuery.data) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <PageHeader
          title="My organisation"
          description="Tenant identity and contact details for the organisation in this session."
        />
        <p className="ims-alert ims-alert-error" role="alert">
          Unable to load the current organisation. Seed demo data or create a
          new organisation.
        </p>
        <Button asChild>
          <Link to="/onboard/organisation">Create organisation</Link>
        </Button>
      </div>
    );
  }

  const organisation = orgQuery.data;
  const addressLine = formatAddress(organisation.address);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="My organisation"
        description="Tenant identity and contact details for the organisation in this session."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/onboard/organisation">Create organisation</Link>
          </Button>
        }
      />

      <section className="ims-panel overflow-hidden">
        <div className="flex flex-wrap items-start gap-4 px-4 py-5">
          <span
            aria-hidden
            className="inline-flex size-14 shrink-0 items-center justify-center rounded-md border border-border bg-surface-muted text-muted-foreground"
          >
            <Building2 className="size-6" />
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[1.125rem] font-semibold tracking-[-0.015em] text-foreground">
                {organisation.name}
              </h2>
              <StatusBadge
                tone={organisation.status === "Running" ? "success" : "warning"}
              >
                {organisation.status}
              </StatusBadge>
              {organisation.isCustomer ? (
                <StatusBadge tone="info">Customer</StatusBadge>
              ) : null}
            </div>
            <p className="truncate text-[0.8125rem] text-muted-foreground">
              {organisation.officeEmail}
            </p>
            <p className="ims-text-meta font-mono">{organisation.reference}</p>
            <p className="text-[0.8125rem] text-muted-foreground">
              {[organisation.industry, String(organisation.sizeOfOrganisation)]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {organisation.membership ? (
              <p className="text-[0.8125rem] text-muted-foreground">
                Your role: {organisation.membership.role}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <OrgCard title="Basic information">
          <dl className="ims-detail-grid">
            <DetailItem label="Organisation name" value={organisation.name} />
            <DetailItem label="Industry" value={organisation.industry} />
            <DetailItem
              label="Size"
              value={String(organisation.sizeOfOrganisation)}
            />
            <DetailItem
              label="Company number"
              value={organisation.companyNumber || "—"}
            />
            <DetailItem
              label="VAT number"
              value={organisation.vatNumber || "—"}
            />
            <DetailItem
              label="Status"
              value={
                <StatusBadge
                  tone={
                    organisation.status === "Running" ? "success" : "warning"
                  }
                >
                  {organisation.status}
                </StatusBadge>
              }
            />
          </dl>
        </OrgCard>

        <OrgCard title="Contact & address">
          <dl className="ims-detail-grid">
            <DetailItem
              label="Office email"
              value={organisation.officeEmail || "—"}
            />
            <DetailItem
              label="Contact number"
              value={organisation.contactNumber || "—"}
            />
            <DetailItem
              label="Address line 1"
              value={organisation.address.line1 || "—"}
            />
            <DetailItem
              label="Address line 2"
              value={organisation.address.line2 || "—"}
            />
            <DetailItem label="City" value={organisation.address.city || "—"} />
            <DetailItem
              label="County"
              value={organisation.address.county || "—"}
            />
            <DetailItem
              label="Post code"
              value={organisation.address.postCode || "—"}
            />
            <DetailItem
              label="Country"
              value={organisation.address.country || "—"}
            />
            <DetailItem label="Full address" value={addressLine || "—"} />
          </dl>
        </OrgCard>

        <OrgCard
          title="Directory"
          action={
            <span className="ims-text-meta">
              {membersQuery.isSuccess
                ? `${membersQuery.data.total} active`
                : null}
            </span>
          }
        >
          <dl className="ims-detail-grid">
            <DetailItem
              label="Active members"
              value={
                membersQuery.isLoading ? (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Loading…
                  </span>
                ) : membersQuery.isSuccess ? (
                  String(membersQuery.data.total)
                ) : (
                  "—"
                )
              }
            />
            <DetailItem
              label="Organisation id"
              value={
                <span className="font-mono text-[0.75rem]">
                  {organisation.id}
                </span>
              }
            />
            <DetailItem
              label="Customer"
              value={organisation.isCustomer ? "Yes" : "No"}
            />
            <DetailItem
              label="Super user licences"
              value={`${organisation.licences.superUser.used} / ${organisation.licences.superUser.allocated}`}
            />
          </dl>
        </OrgCard>

        <OrgCard title="Coming soon">
          <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
            Editing organisation details, go-live, licences, branding, and
            billing will expand as the Organisation module grows in V5.
          </p>
        </OrgCard>
      </div>
    </div>
  );
}
