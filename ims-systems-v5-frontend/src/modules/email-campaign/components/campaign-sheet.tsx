import { useEffect, useState } from "react";
import { AppSheet } from "@/shared/components/app-sheet";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/shared/components/ui/button";
import { SheetPanelTabs } from "@/modules/activities";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import {
  useCloseEmailCampaignMutation,
  useCreateAndLaunchEmailCampaignMutation,
  useCreateEmailCampaignMutation,
  useEmailCampaignQuery,
  useLaunchEmailCampaignMutation,
  useUpdateEmailCampaignMutation,
} from "../hooks/use-email-campaigns";
import type {
  CreateEmailCampaignInput,
  UpdateEmailCampaignInput,
} from "../types";
import {
  CampaignDetails,
  CampaignDetailsLoading,
} from "./campaign-details";
import { CampaignForm, type FormAction } from "./campaign-form";

export type CampaignSheetMode = "create" | "view" | "edit";

type CampaignSheetProps = {
  open: boolean;
  mode: CampaignSheetMode;
  campaignId?: string | null;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: CampaignSheetMode) => void;
  onCreated?: () => void;
};

/**
 * Create / view / edit sheet for Email Campaign records.
 */
export function CampaignSheet({
  open,
  mode,
  campaignId,
  onOpenChange,
  onModeChange,
  onCreated,
}: CampaignSheetProps) {
  const [panelTab, setPanelTab] = useState("overview");
  const [confirmAction, setConfirmAction] = useState<FormAction | null>(null);
  const [pendingValues, setPendingValues] =
    useState<CreateEmailCampaignInput | null>(null);

  useEffect(() => {
    if (!open || mode !== "view") setPanelTab("overview");
  }, [open, mode, campaignId]);

  const campaignQuery = useEmailCampaignQuery(
    mode === "create" ? undefined : (campaignId ?? undefined)
  );
  const createMutation = useCreateEmailCampaignMutation();
  const createLaunchMutation = useCreateAndLaunchEmailCampaignMutation();
  const updateMutation = useUpdateEmailCampaignMutation(campaignId ?? "");
  const launchMutation = useLaunchEmailCampaignMutation();
  const closeMutation = useCloseEmailCampaignMutation();

  const campaign = campaignQuery.data;
  const pending =
    createMutation.isPending ||
    createLaunchMutation.isPending ||
    updateMutation.isPending ||
    launchMutation.isPending ||
    closeMutation.isPending;

  function errorMessage(error: unknown, fallback: string): string {
    if (isApiClientError(error)) return error.message;
    return fallback;
  }

  async function runAction(
    action: FormAction,
    values: CreateEmailCampaignInput
  ) {
    try {
      if (action === "save") {
        await createMutation.mutateAsync(values);
        notify.success("Campaign saved as draft");
        onCreated?.();
        onOpenChange(false);
        return;
      }
      if (action === "launch") {
        await createLaunchMutation.mutateAsync(values);
        notify.success("Campaign launched");
        onCreated?.();
        onOpenChange(false);
        return;
      }
      if (!campaignId || !campaign) return;

      if (action === "save-modified") {
        await createMutation.mutateAsync({
          ...values,
          name: campaign.name,
          bundleId: campaign.bundleId,
        });
        notify.success("Modified campaign saved");
        onCreated?.();
        onOpenChange(false);
        return;
      }
      if (action === "launch-modified") {
        const body: UpdateEmailCampaignInput = {
          businessUnitId: values.businessUnitId,
          target: values.target,
          customAudience: values.customAudience,
          subject: values.subject,
          message: values.message,
        };
        await updateMutation.mutateAsync(body);
        await launchMutation.mutateAsync(campaignId);
        notify.success("Campaign launched");
        onModeChange("view");
        return;
      }
      if (action === "close") {
        await closeMutation.mutateAsync(campaignId);
        notify.success("Campaign closed");
        onModeChange("view");
      }
    } catch (error) {
      notify.error(errorMessage(error, "Campaign action failed"));
    }
  }

  function handleFormSubmit(
    values: CreateEmailCampaignInput,
    action: FormAction
  ) {
    if (
      action === "launch" ||
      action === "launch-modified" ||
      action === "close" ||
      action === "save-modified"
    ) {
      setPendingValues(values);
      setConfirmAction(action);
      return;
    }
    void runAction(action, values);
  }

  const confirmCopy =
    confirmAction === "close"
      ? "This campaign will be closed"
      : confirmAction === "save-modified"
        ? "A new campaign version will be saved in this bundle"
        : "A campaign will be launched";

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={
          mode === "create"
            ? "New email campaign"
            : (campaign?.name ?? "Email campaign")
        }
        description={
          mode === "view" && campaign
            ? campaign.reference
            : "Compose and send bulk email to CRM customers"
        }
      >
        {mode === "view" ? (
          campaignQuery.isLoading ? (
            <CampaignDetailsLoading />
          ) : campaign ? (
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onModeChange("edit")}
                >
                  Edit
                </Button>
              </div>
              <SheetPanelTabs
                tabs={[
                  { id: "overview", label: "Overview" },
                  { id: "details", label: "Details" },
                  { id: "recipients", label: "Recipients" },
                ]}
                value={panelTab}
                onChange={setPanelTab}
              />
              <CampaignDetails
                campaign={campaign}
                tab={
                  panelTab as "overview" | "details" | "recipients"
                }
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This campaign has been deleted or removed
            </p>
          )
        ) : mode === "edit" && campaign ? (
          <CampaignForm
            mode="edit"
            pending={pending}
            initialValues={{
              name: campaign.name,
              businessUnitId: campaign.businessUnitId,
              target: campaign.target,
              customAudience: campaign.customAudience,
              subject: campaign.subject,
              message: campaign.message,
            }}
            onCancel={() => onModeChange("view")}
            onSubmit={(values, action) =>
              handleFormSubmit(
                {
                  name: campaign.name,
                  businessUnitId: values.businessUnitId,
                  target: values.target,
                  customAudience: values.customAudience,
                  subject: values.subject,
                  message: values.message,
                },
                action
              )
            }
          />
        ) : (
          <CampaignForm
            mode="create"
            pending={pending}
            onCancel={() => onOpenChange(false)}
            onSubmit={(values, action) =>
              handleFormSubmit(
                {
                  name: values.name,
                  businessUnitId: values.businessUnitId,
                  target: values.target,
                  customAudience: values.customAudience,
                  subject: values.subject,
                  message: values.message,
                },
                action
              )
            }
          />
        )}
      </AppSheet>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onOpenChange={(next) => {
          if (!next) {
            setConfirmAction(null);
            setPendingValues(null);
          }
        }}
        title="Confirm"
        description={confirmCopy}
        confirmLabel="Confirm"
        pending={pending}
        onConfirm={() => {
          if (confirmAction && pendingValues) {
            void runAction(confirmAction, pendingValues).then(() => {
              setConfirmAction(null);
              setPendingValues(null);
            });
          }
        }}
      />
    </>
  );
}
