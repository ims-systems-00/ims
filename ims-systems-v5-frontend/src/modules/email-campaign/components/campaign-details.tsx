import { Loader2 } from "lucide-react";
import { useFunctionalUnitsQuery } from "@/modules/functional-units/hooks/use-functional-units";
import { useUserQuery } from "@/modules/users/hooks/use-users";
import {
  useCampaignDeliveriesQuery,
  useCampaignOverviewQuery,
} from "../hooks/use-email-campaigns";
import type { EmailCampaign } from "../types";
import { CampaignStatusBadge } from "./campaign-badges";
import { formatDate } from "@/shared/lib/format-date";

export function CampaignDetailsLoading() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Loading campaign…
    </div>
  );
}

type CampaignDetailsProps = {
  campaign: EmailCampaign;
  tab?: "overview" | "details" | "recipients";
};

export function CampaignDetails({
  campaign,
  tab = "details",
}: CampaignDetailsProps) {
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  const creatorQuery = useUserQuery(campaign.createdBy, true);
  const unitName =
    unitsQuery.data?.items.find((u) => u.id === campaign.businessUnitId)
      ?.name ?? campaign.businessUnitId.slice(0, 8);

  if (tab === "overview") {
    return (
      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Reference</dt>
          <dd className="font-medium">{campaign.reference}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Business unit</dt>
          <dd>{unitName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Raised by</dt>
          <dd>{creatorQuery.data?.user.name ?? campaign.createdBy.slice(0, 8)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Target stages</dt>
          <dd>
            {campaign.target.length > 0
              ? campaign.target.join(", ")
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd className="mt-1">
            <CampaignStatusBadge status={campaign.status} />
            {campaign.closed ? (
              <span className="ml-2 text-muted-foreground">(closed)</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Created on</dt>
          <dd>{formatDate(campaign.createdOn)}</dd>
        </div>
      </dl>
    );
  }

  if (tab === "recipients") {
    return <RecipientsPanel campaignId={campaign.id} />;
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div>
        <h3 className="mb-2 font-medium">Additional audience</h3>
        {campaign.customAudience.length === 0 ? (
          <p className="text-muted-foreground">None selected</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {campaign.customAudience.map((entry) => (
              <li key={entry.customerId} className="px-3 py-2">
                {entry.reference} · {entry.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="mb-1 font-medium">Subject</h3>
        <p>{campaign.subject}</p>
      </div>
      <div>
        <h3 className="mb-1 font-medium">Message</h3>
        <p className="whitespace-pre-wrap">{campaign.message}</p>
      </div>
      <div>
        <h3 className="mb-1 font-medium">Attachments</h3>
        {campaign.attachments.length === 0 ? (
          <p className="text-muted-foreground">No attachments</p>
        ) : (
          <ul className="list-inside list-disc">
            {campaign.attachments.map((file) => (
              <li key={file.id}>{file.fileName}</li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="mb-1 font-medium">Sent from</h3>
        <p>
          {campaign.sentFrom.name} &lt;{campaign.sentFrom.email}&gt;
        </p>
      </div>
    </div>
  );
}

function RecipientsPanel({ campaignId }: { campaignId: string }) {
  const overviewQuery = useCampaignOverviewQuery(campaignId);
  const deliveriesQuery = useCampaignDeliveriesQuery(campaignId, 1);

  if (overviewQuery.isLoading || deliveriesQuery.isLoading) {
    return <CampaignDetailsLoading />;
  }

  const recipients =
    deliveriesQuery.data?.items.flatMap((batch) => batch.recipients) ?? [];

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-wrap gap-4">
        <p>
          Customer reach{" "}
          <strong>{overviewQuery.data?.totalCustomers ?? 0}</strong>
        </p>
        <p>
          Total recipients{" "}
          <strong>{overviewQuery.data?.totalRecipients ?? 0}</strong>
        </p>
      </div>
      {recipients.length === 0 ? (
        <p className="text-muted-foreground">
          Recipients appear after the campaign is sent.
        </p>
      ) : (
        <ul className="grid gap-2">
          {recipients.map((recipient, index) => (
            <li
              key={`${recipient.email}-${index}`}
              className="rounded-md border border-border px-3 py-2"
            >
              <p className="font-medium">{recipient.name}</p>
              <p className="text-muted-foreground">{recipient.email}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
