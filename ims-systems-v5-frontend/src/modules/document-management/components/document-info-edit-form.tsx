import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Save } from "lucide-react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import { useUpdateDocumentNodeMutation } from "../hooks/use-document-management";
import { updateDocumentInfoFormSchema } from "../schemas";
import type { DocumentTreeNode } from "../types";
import {
  DOCUMENT_APPLICABLE_MODULE_LABELS,
  DOCUMENT_APPLICABLE_MODULES,
  DOCUMENT_PURPOSE_LABELS,
  DOCUMENT_PURPOSES,
  type DocumentApplicableModule,
  type DocumentPurpose,
} from "../types";
import { OwnerMultiSelect } from "./owner-multi-select";

type DocumentInfoEditFormProps = {
  repositoryId: string;
  node: DocumentTreeNode;
  /** Hide the inline Save button when a parent dialog provides footer actions. */
  hideSubmit?: boolean;
  formId?: string;
  onSaved?: () => void;
};

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function fromDateInputValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return new Date(`${trimmed}T00:00:00.000Z`).toISOString();
}

/**
 * Editable document metadata: purpose, modules, owners, review date.
 */
export function DocumentInfoEditForm({
  repositoryId,
  node,
  hideSubmit = false,
  formId = "document-info-edit-form",
  onSaved,
}: DocumentInfoEditFormProps) {
  const data = node.documentData;
  const updateMutation = useUpdateDocumentNodeMutation(repositoryId);
  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });

  const [purpose, setPurpose] = useState<DocumentPurpose>("Document");
  const [modules, setModules] = useState<DocumentApplicableModule[]>([]);
  const [owners, setOwners] = useState<string[]>([]);
  const [reviewDate, setReviewDate] = useState("");
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!data) return;
    setPurpose(data.purpose);
    setModules([...(data.applicableModules ?? [])]);
    setOwners([...(data.owners ?? [])]);
    setReviewDate(toDateInputValue(data.reviewDate));
    setError(undefined);
  }, [data, node.id]);

  const userOptions = useMemo(
    () =>
      (usersQuery.data?.items ?? []).map((row) => ({
        id: row.user.id,
        label: row.user.name?.trim() || row.user.email,
        email: row.user.email,
      })),
    [usersQuery.data]
  );

  function toggleModule(module: DocumentApplicableModule) {
    setModules((current) =>
      current.includes(module)
        ? current.filter((item) => item !== module)
        : [...current, module]
    );
  }

  async function handleSave(event?: FormEvent) {
    event?.preventDefault();
    const parsed = updateDocumentInfoFormSchema.safeParse({
      purpose,
      applicableModules: modules,
      owners,
      reviewDate: reviewDate.trim() ? reviewDate : null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid document details");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        nodeId: node.id,
        body: {
          purpose: parsed.data.purpose,
          applicableModules: parsed.data.applicableModules,
          owners: parsed.data.owners,
          reviewDate: fromDateInputValue(parsed.data.reviewDate ?? ""),
        },
      });
      notify.success("Document information updated");
      setError(undefined);
      onSaved?.();
    } catch (err) {
      notify.fromError(err, "Unable to update document information");
    }
  }

  if (!data) return null;

  return (
    <form id={formId} className="space-y-4" onSubmit={(e) => void handleSave(e)}>
      <FormField label="Purpose" htmlFor="edit-doc-purpose" required>
        <select
          id="edit-doc-purpose"
          className="ims-select"
          value={purpose}
          onChange={(event) =>
            setPurpose(event.target.value as DocumentPurpose)
          }
        >
          {DOCUMENT_PURPOSES.map((value) => (
            <option key={value} value={value}>
              {DOCUMENT_PURPOSE_LABELS[value]}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Applicable modules" htmlFor="edit-doc-modules">
        <div id="edit-doc-modules" className="flex flex-wrap gap-1.5">
          {DOCUMENT_APPLICABLE_MODULES.map((module) => {
            const selected = modules.includes(module);
            return (
              <button
                key={module}
                type="button"
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[0.6875rem] font-medium transition-colors",
                  selected
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border-subtle text-muted-foreground hover:bg-muted/40"
                )}
                onClick={() => toggleModule(module)}
              >
                {DOCUMENT_APPLICABLE_MODULE_LABELS[module]}
              </button>
            );
          })}
        </div>
      </FormField>

      <FormField label="Select owner(s)" required error={error}>
        <OwnerMultiSelect
          options={userOptions}
          value={owners}
          onChange={(next) => {
            setOwners(next);
            setError(undefined);
          }}
          loading={usersQuery.isLoading}
          max={5}
        />
      </FormField>

      <FormField label="Document review date" htmlFor="edit-doc-review">
        <Input
          id="edit-doc-review"
          type="date"
          value={reviewDate}
          onChange={(event) => setReviewDate(event.target.value)}
        />
      </FormField>

      {!hideSubmit ? (
        <Button
          type="submit"
          size="sm"
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          Save changes
        </Button>
      ) : null}
    </form>
  );
}
