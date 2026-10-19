import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/layout";
import { SheetPanelTabs } from "@/modules/activities";
import { useState } from "react";
import {
  CampaignDetails,
  CampaignDetailsLoading,
} from "../components/campaign-details";
import { CampaignStatusBadge } from "../components/campaign-badges";
import { useEmailCampaignQuery } from "../hooks/use-email-campaigns";

/**
 * Full-page campaign detail (Details | Recipients).
 * Hidden from sidebar; opened from list row actions.
 */
export function EmailCampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState("details");
  const campaignQuery = useEmailCampaignQuery(id);

  if (campaignQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading campaign…
      </div>
    );
  }

  if (campaignQuery.isError || !campaignQuery.data) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          This campaign has been deleted or removed
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/email-campaigns">
            <ArrowLeft />
            Back to campaigns
          </Link>
        </Button>
      </div>
    );
  }

  const campaign = campaignQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={campaign.name}
        description={campaign.reference}
        actions={
          <div className="flex items-center gap-2">
            <CampaignStatusBadge status={campaign.status} />
            <Button asChild variant="outline" size="sm">
              <Link to="/email-campaigns">
                <ArrowLeft />
                Back
              </Link>
            </Button>
          </div>
        }
      />

      <SheetPanelTabs
        tabs={[
          { id: "details", label: "Details" },
          { id: "recipients", label: "Recipients" },
        ]}
        value={tab}
        onChange={setTab}
        aria-label="Campaign panels"
      />

      {campaignQuery.isFetching && !campaignQuery.isLoading ? (
        <CampaignDetailsLoading />
      ) : (
        <CampaignDetails
          campaign={campaign}
          tab={tab === "recipients" ? "recipients" : "details"}
        />
      )}
    </div>
  );
}
