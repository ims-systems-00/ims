import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import {
  DEV_STUB_IDENTITY,
  resolveProfileUserId,
} from "@/security";
import { useFunctionalUnitsQuery } from "@/modules/functional-units/hooks/use-functional-units";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import { useCreateDocumentRepositoryMutation } from "../hooks/use-document-management";
import { createRepositoryFormSchema } from "../schemas";
import {
  DOCUMENT_PRIVACY_VALUES,
  DOCUMENT_REVIEW_INTERVALS,
  type DocumentPrivacy,
  type DocumentReviewInterval,
} from "../types";

type RepositoryFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MAX_OWNERS = 3;

export function RepositoryFormSheet({
  open,
  onOpenChange,
}: RepositoryFormSheetProps) {
  const createMutation = useCreateDocumentRepositoryMutation();
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });

  const defaultOwnerId =
    resolveProfileUserId(DEV_STUB_IDENTITY) ?? DEV_STUB_IDENTITY.subjectId;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<DocumentPrivacy>("Organisational");
  const [businessUnitId, setBusinessUnitId] = useState("");
  const [owners, setOwners] = useState<string[]>([defaultOwnerId]);
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [reviewInterval, setReviewInterval] =
    useState<DocumentReviewInterval>("Yearly");
  const [formError, setFormError] = useState<string | undefined>();
  const [ownerError, setOwnerError] = useState<string | undefined>();

  const units = useMemo(() => unitsQuery.data?.items ?? [], [unitsQuery.data]);
  const userOptions = useMemo(
    () =>
      (usersQuery.data?.items ?? []).map((row) => ({
        id: row.user.id,
        label: row.user.name,
        email: row.user.email,
      })),
    [usersQuery.data]
  );

  useEffect(() => {
    if (!open) return;
    if (privacy === "Only me") {
      setOwners([defaultOwnerId]);
      setSharedWith([]);
    }
  }, [privacy, open, defaultOwnerId]);

  function reset() {
    setName("");
    setDescription("");
    setPrivacy("Organisational");
    setBusinessUnitId("");
    setOwners([defaultOwnerId]);
    setSharedWith([]);
    setReviewInterval("Yearly");
    setFormError(undefined);
    setOwnerError(undefined);
  }

  function toggleOwner(userId: string) {
    if (privacy === "Only me") return;
    setOwners((current) => {
      if (current.includes(userId)) {
        if (current.length === 1) return current;
        return current.filter((id) => id !== userId);
      }
      if (current.length >= MAX_OWNERS) {
        setOwnerError(`You can select up to ${MAX_OWNERS} owners`);
        return current;
      }
      setOwnerError(undefined);
      return [...current, userId];
    });
  }

  function toggleSharedWith(userId: string) {
    setSharedWith((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  }

  async function handleSubmit() {
    const nextOwners =
      privacy === "Only me"
        ? [defaultOwnerId]
        : owners.length > 0
          ? owners
          : [defaultOwnerId];

    const parsed = createRepositoryFormSchema.safeParse({
      name,
      description,
      privacy,
      businessUnitId: privacy === "Business unit" ? businessUnitId : null,
      owners: nextOwners,
      sharedWith: privacy === "Custom" ? sharedWith : [],
      reviewInterval,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      if (issue?.path[0] === "owners") {
        setOwnerError(issue.message);
      } else {
        setFormError(issue?.message);
      }
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: parsed.data.name,
        description: parsed.data.description,
        privacy: parsed.data.privacy,
        businessUnitId: parsed.data.businessUnitId,
        owners: parsed.data.owners,
        sharedWith: parsed.data.sharedWith,
        reviewInterval: parsed.data.reviewInterval,
      });
      notify.success("Repository created");
      reset();
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to create repository");
    }
  }

  const ownersLocked = privacy === "Only me";

  return (
    <AppSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title="Create repository"
      description="A controlled document library with privacy, owners, and review cadence."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            Create
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <FormField
          label="Name"
          htmlFor="repo-name"
          required
          error={formError}
        >
          <Input
            id="repo-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setFormError(undefined);
            }}
            placeholder="e.g. Policies & procedures"
          />
        </FormField>

        <FormField label="Description" htmlFor="repo-desc">
          <Textarea
            id="repo-desc"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Optional summary for this library"
          />
        </FormField>

        <FormField label="Privacy" htmlFor="repo-privacy" required>
          <select
            id="repo-privacy"
            className="ims-select"
            value={privacy}
            onChange={(event) =>
              setPrivacy(event.target.value as DocumentPrivacy)
            }
          >
            {DOCUMENT_PRIVACY_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </FormField>

        {privacy === "Business unit" ? (
          <FormField label="Business unit" htmlFor="repo-bu" required>
            <select
              id="repo-bu"
              className="ims-select"
              value={businessUnitId}
              onChange={(event) => setBusinessUnitId(event.target.value)}
            >
              <option value="">Select unit…</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}

        <FormField
          label="Owners"
          required
          error={ownerError}
          description={
            ownersLocked
              ? "Only me repositories are owned by you."
              : `Select up to ${MAX_OWNERS} people accountable for this library.`
          }
        >
          {usersQuery.isLoading ? (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading users…
            </div>
          ) : userOptions.length === 0 ? (
            <p className="rounded-md border border-dashed border-border-subtle px-3 py-3 text-[0.75rem] text-muted-foreground">
              No users found. Seed demo users or create users first.
            </p>
          ) : (
            <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-border-subtle p-2">
              {userOptions.map((user) => {
                const selected = owners.includes(user.id);
                return (
                  <label
                    key={user.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                      selected
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted/50",
                      ownersLocked && "cursor-default opacity-80"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-3.5 accent-primary"
                      checked={selected}
                      disabled={ownersLocked}
                      onChange={() => toggleOwner(user.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {user.label}
                      </span>
                      <span className="block truncate text-[0.6875rem] text-muted-foreground">
                        {user.email}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </FormField>

        {privacy === "Custom" ? (
          <FormField
            label="Shared with"
            description="Extra people who can see this repository."
          >
            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-border-subtle p-2">
              {userOptions.map((user) => {
                const selected = sharedWith.includes(user.id);
                return (
                  <label
                    key={user.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                      selected
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-3.5 accent-primary"
                      checked={selected}
                      onChange={() => toggleSharedWith(user.id)}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {user.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </FormField>
        ) : null}

        <FormField label="Review interval" htmlFor="repo-review">
          <select
            id="repo-review"
            className="ims-select"
            value={reviewInterval}
            onChange={(event) =>
              setReviewInterval(event.target.value as DocumentReviewInterval)
            }
          >
            {DOCUMENT_REVIEW_INTERVALS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </FormField>
      </div>
    </AppSheet>
  );
}
