import { Building2 } from "lucide-react";
import { StatusBadge } from "@/shared/components/status-badge";
import { ImageUploadControl } from "@/modules/files/components/image-upload-control";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { useUpdateOrganisationLogoMutation } from "../hooks/use-organisations";
import type { OrganisationProfile } from "../types";

type OrganisationProfileHeaderProps = {
  organisation: OrganisationProfile;
  logoUrl: string | null;
  canManageLogo: boolean;
  className?: string;
};

/**
 * Minimal organisation identity strip (logo + name), matching other page panels.
 */
export function OrganisationProfileHeader({
  organisation,
  logoUrl,
  canManageLogo,
  className,
}: OrganisationProfileHeaderProps) {
  const logoMutation = useUpdateOrganisationLogoMutation();

  return (
    <section className={cn("ims-panel flex flex-col", className)}>
      <div className="flex flex-1 flex-wrap items-start gap-4 px-4 py-4">
        {canManageLogo ? (
          <ImageUploadControl
            shape="rounded"
            tileClassName="size-14 text-base"
            imageUrl={logoUrl}
            alt={`${organisation.name} logo`}
            fallbackLabel={organisation.name.slice(0, 2).toUpperCase()}
            uploadPath="general"
            uploadLabel="Upload logo"
            changeLabel="Change logo"
            onUploaded={async (meta, viewUrl) => {
              await logoMutation.mutateAsync({
                logoSrc: viewUrl,
                logoStorage: {
                  bucket: meta.Bucket,
                  key: meta.Key || meta.key,
                  fileName: meta.Name,
                },
              });
              notify.success("Organisation logo updated");
            }}
            onRemove={async () => {
              await logoMutation.mutateAsync({
                logoSrc: null,
                logoStorage: null,
              });
              notify.success("Organisation logo removed");
            }}
          />
        ) : logoUrl ? (
          <img
            src={logoUrl}
            alt={`${organisation.name} logo`}
            className="size-14 shrink-0 rounded-md border border-border object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="inline-flex size-14 shrink-0 items-center justify-center rounded-md border border-border bg-surface-muted text-muted-foreground"
          >
            <Building2 className="size-6" />
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-1">
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
            {organisation.membership
              ? ` · Your role: ${organisation.membership.role}`
              : null}
          </p>
        </div>
      </div>
    </section>
  );
}
