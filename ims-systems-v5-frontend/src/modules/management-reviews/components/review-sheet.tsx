import { useState } from "react";
import { AppSheet } from "@/shared/components/app-sheet";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/shared/components/ui/button";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import {
  useCompleteManagementReviewMutation,
  useCreateManagementReviewMutation,
  useDeleteManagementReviewMutation,
  useManagementReviewQuery,
  useUpdateManagementReviewMutation,
} from "../hooks/use-management-reviews";
import type {
  CreateManagementReviewInput,
  UpdateManagementReviewInput,
} from "../types";
import { ReviewDetails, ReviewDetailsLoading } from "./review-details";
import { ReviewForm, ReviewFormActions } from "./review-form";

export type ReviewSheetMode = "create" | "view" | "edit";

type ReviewSheetProps = {
  open: boolean;
  mode: ReviewSheetMode;
  reviewId?: string | null;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: ReviewSheetMode) => void;
  onCreated?: (count: number) => void;
  onDeleted?: () => void;
  onActionMessage?: (message: string) => void;
};

/**
 * Reusable create / view / edit sheet for Management Reviews.
 */
export function ReviewSheet({
  open,
  mode,
  reviewId,
  onOpenChange,
  onModeChange,
  onCreated,
  onDeleted,
  onActionMessage,
}: ReviewSheetProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const reviewQuery = useManagementReviewQuery(
    mode === "create" ? undefined : (reviewId ?? undefined)
  );
  const createMutation = useCreateManagementReviewMutation();
  const updateMutation = useUpdateManagementReviewMutation(reviewId ?? "");
  const deleteMutation = useDeleteManagementReviewMutation();
  const completeMutation = useCompleteManagementReviewMutation();

  const review = reviewQuery.data;
  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    completeMutation.isPending;

  const completed = Boolean(review?.completed.status);
  const canComplete =
    Boolean(review) &&
    !completed &&
    review != null &&
    new Date(review.date).getTime() <= Date.now();

  async function handleCreate(
    values: CreateManagementReviewInput | UpdateManagementReviewInput
  ) {
    const result = await createMutation.mutateAsync(
      values as CreateManagementReviewInput
    );
    onCreated?.(result.items.length);
    onOpenChange(false);
  }

  async function handleUpdate(
    values: CreateManagementReviewInput | UpdateManagementReviewInput
  ) {
    await updateMutation.mutateAsync(values as UpdateManagementReviewInput);
    notify.success("Management review updated successfully");
    onModeChange("view");
  }

  async function confirmDelete() {
    if (!reviewId) return;
    try {
      await deleteMutation.mutateAsync(reviewId);
      setDeleteOpen(false);
      onDeleted?.();
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to delete management review");
    }
  }

  async function confirmComplete() {
    if (!reviewId) return;
    try {
      await completeMutation.mutateAsync(reviewId);
      setCompleteOpen(false);
      const message = "Management review marked as completed";
      onActionMessage?.(message);
      if (!onActionMessage) notify.success(message);
      onModeChange("view");
    } catch (error) {
      notify.fromError(error, "Unable to complete management review");
    }
  }

  const title =
    mode === "create"
      ? "Schedule management review"
      : mode === "edit"
        ? "Edit management review"
        : review
          ? review.title
          : "Management review";

  const description =
    mode === "create"
      ? "Schedule one or more management review meetings across a chosen interval."
      : mode === "edit"
        ? completed
          ? "This review is completed and cannot be edited."
          : "Update title, schedule, privacy, and attendees. Interval and business unit stay fixed."
        : review?.reference;

  const formId = mode === "create" ? "review-create" : "review-edit";

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        footer={
          mode === "create" ? (
            <ReviewFormActions
              formId={formId}
              submitLabel="Schedule review"
              pending={pending}
              onCancel={() => onOpenChange(false)}
            />
          ) : mode === "edit" ? (
            completed ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => onModeChange("view")}
              >
                Back
              </Button>
            ) : (
              <ReviewFormActions
                formId={formId}
                submitLabel="Save"
                pending={pending}
                onCancel={() => onModeChange("view")}
              />
            )
          ) : review ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              {!completed ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={pending}
                    onClick={() => setDeleteOpen(true)}
                  >
                    Delete
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending || !canComplete}
                    title={
                      !canComplete
                        ? "Cannot complete before the schedule date"
                        : undefined
                    }
                    onClick={() => setCompleteOpen(true)}
                  >
                    Complete
                  </Button>
                  <Button type="button" onClick={() => onModeChange("edit")}>
                    Edit
                  </Button>
                </>
              ) : null}
            </>
          ) : null
        }
      >
        {mode === "create" ? (
          <ReviewForm
            mode="create"
            formId={formId}
            pending={pending}
            hideActions
            submitLabel="Schedule review"
            onSubmit={handleCreate}
          />
        ) : null}

        {mode !== "create" && reviewQuery.isLoading ? (
          <ReviewDetailsLoading />
        ) : null}

        {mode !== "create" && reviewQuery.isError ? (
          <p className="ims-alert ims-alert-error" role="alert">
            {isApiClientError(reviewQuery.error)
              ? reviewQuery.error.message
              : "Unable to load management review"}
          </p>
        ) : null}

        {mode === "view" && review ? <ReviewDetails review={review} /> : null}

        {mode === "edit" && review ? (
          completed ? (
            <p className="ims-alert ims-alert-info" role="status">
              This management review has been completed and cannot be updated.
            </p>
          ) : (
            <ReviewForm
              mode="edit"
              formId={formId}
              pending={pending}
              hideActions
              initialReview={review}
              submitLabel="Save"
              onSubmit={handleUpdate}
            />
          )
        ) : null}
      </AppSheet>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this management review?"
        description="The review will be removed from the register. Linked tasks sourced from this review will also be removed."
        confirmLabel="Delete review"
        pending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />

      <ConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="Complete this management review?"
        description="This management review will be completed and become read-only."
        confirmLabel="Mark completed"
        pending={completeMutation.isPending}
        onConfirm={() => void confirmComplete()}
      />
    </>
  );
}

export { ReviewSheet as ReviewDetailsSheet };
