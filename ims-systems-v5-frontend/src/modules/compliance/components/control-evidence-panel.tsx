import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { notify } from "@/shared/lib/toast";
import { useIncidentsQuery } from "@/modules/incidents/hooks/use-incidents";
import { useOfisQuery } from "@/modules/ofi/hooks/use-ofi";
import { useRisksQuery } from "@/modules/risks/hooks/use-risks";
import {
  useCreateControlEvidenceMutation,
  useRemoveControlEvidenceMutation,
} from "../hooks/use-compliance";
import {
  createControlEvidenceSchema,
  type CreateControlEvidenceFormValues,
} from "../schemas";
import type {
  ControlEvidence,
  ControlEvidenceType,
  CreateControlEvidenceInput,
} from "../types";

const EVIDENCE_TYPE_OPTIONS: Array<{
  value: ControlEvidenceType;
  label: string;
  disabled?: boolean;
}> = [
  { value: "risk-management", label: "Risk" },
  { value: "incident-management", label: "Incident" },
  { value: "cip", label: "OFI / CIP" },
  { value: "text-content", label: "Text note" },
  { value: "raw-file", label: "File metadata" },
  {
    value: "document-management",
    label: "Document (unavailable)",
    disabled: true,
  },
];

type ControlEvidencePanelProps = {
  controlStatusId: string;
  items: ControlEvidence[];
  isLoading?: boolean;
  isError?: boolean;
};

function evidenceLabel(item: ControlEvidence): string {
  switch (item.evidenceType) {
    case "risk-management":
      return `Risk ${item.relatedRiskId?.slice(0, 8) ?? ""}`;
    case "incident-management":
      return `Incident ${item.relatedIncidentId?.slice(0, 8) ?? ""}`;
    case "cip":
      return `OFI ${item.relatedCipId?.slice(0, 8) ?? ""}`;
    case "document-management":
      return `Document ${item.relatedDocumentId?.slice(0, 8) ?? ""}`;
    case "raw-file":
      return item.fileStorage?.fileName ?? "Raw file";
    case "text-content":
      return item.textContent?.slice(0, 80) || "Text evidence";
    default:
      return item.evidenceType;
  }
}

function evidenceHref(item: ControlEvidence): string | null {
  if (item.evidenceType === "risk-management" && item.relatedRiskId) {
    return `/risks?risk=${item.relatedRiskId}`;
  }
  if (item.evidenceType === "incident-management" && item.relatedIncidentId) {
    return `/incidents?incident=${item.relatedIncidentId}`;
  }
  if (item.evidenceType === "cip" && item.relatedCipId) {
    return `/ofi?ofi=${item.relatedCipId}`;
  }
  return null;
}

/**
 * Structured control evidence: list, link, unlink.
 */
export function ControlEvidencePanel({
  controlStatusId,
  items,
  isLoading = false,
  isError = false,
}: ControlEvidencePanelProps) {
  const createMutation = useCreateControlEvidenceMutation(controlStatusId);
  const removeMutation = useRemoveControlEvidenceMutation(controlStatusId);
  const [pendingRemove, setPendingRemove] = useState<ControlEvidence | null>(
    null
  );
  const [evidenceType, setEvidenceType] =
    useState<ControlEvidenceType>("risk-management");
  const [relatedRiskId, setRelatedRiskId] = useState("");
  const [relatedIncidentId, setRelatedIncidentId] = useState("");
  const [relatedCipId, setRelatedCipId] = useState("");
  const [textContent, setTextContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");

  const risksQuery = useRisksQuery({
    page: 1,
    pageSize: 20,
    search: pickerSearch || undefined,
  });
  const incidentsQuery = useIncidentsQuery({
    page: 1,
    pageSize: 20,
    search: pickerSearch || undefined,
  });
  const ofisQuery = useOfisQuery({
    page: 1,
    pageSize: 20,
    search: pickerSearch || undefined,
  });

  const pickerOptions = useMemo(() => {
    if (evidenceType === "risk-management") {
      return (risksQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        label: `${row.reference} — ${row.title}`,
      }));
    }
    if (evidenceType === "incident-management") {
      return (incidentsQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        label: `${row.reference} — ${row.title}`,
      }));
    }
    if (evidenceType === "cip") {
      return (ofisQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        label: `${row.reference} — ${row.title}`,
      }));
    }
    return [];
  }, [evidenceType, risksQuery.data, incidentsQuery.data, ofisQuery.data]);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const formValues: CreateControlEvidenceFormValues = {
      evidenceType,
      relatedRiskId,
      relatedIncidentId,
      relatedCipId,
      textContent,
      fileName,
      fileUrl,
    };
    const parsed = createControlEvidenceSchema.safeParse(formValues);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Invalid evidence");
      return;
    }
    setFieldError(null);

    const body: CreateControlEvidenceInput = {
      evidenceType: parsed.data.evidenceType,
    };
    if (parsed.data.evidenceType === "risk-management") {
      body.relatedRiskId = parsed.data.relatedRiskId;
    }
    if (parsed.data.evidenceType === "incident-management") {
      body.relatedIncidentId = parsed.data.relatedIncidentId;
    }
    if (parsed.data.evidenceType === "cip") {
      body.relatedCipId = parsed.data.relatedCipId;
    }
    if (parsed.data.evidenceType === "text-content") {
      body.textContent = parsed.data.textContent;
    }
    if (parsed.data.evidenceType === "raw-file") {
      body.fileStorage = {
        fileName: parsed.data.fileName!,
        url: parsed.data.fileUrl || undefined,
      };
    }

    try {
      await createMutation.mutateAsync(body);
      notify.success("Evidence linked");
      setRelatedRiskId("");
      setRelatedIncidentId("");
      setRelatedCipId("");
      setTextContent("");
      setFileName("");
      setFileUrl("");
    } catch (error) {
      notify.fromError(error, "Unable to link evidence");
    }
  }

  async function confirmRemove() {
    if (!pendingRemove) return;
    try {
      await removeMutation.mutateAsync(pendingRemove.id);
      notify.success("Evidence unlinked");
      setPendingRemove(null);
    } catch (error) {
      notify.fromError(error, "Unable to unlink evidence");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading evidence…
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">Unable to load control evidence.</p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Linked evidence</h3>
        {items.length === 0 ? (
          <EmptyState
            title="No evidence linked"
            description="Link risks, incidents, OFIs, notes, or file metadata to this control."
          />
        ) : (
          <ul className="divide-y divide-border-subtle rounded-md border border-border">
            {items.map((item) => {
              const href = evidenceHref(item);
              return (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                      {item.evidenceType}
                    </p>
                    {href ? (
                      <Link
                        to={href}
                        className="mt-0.5 block truncate text-sm text-primary hover:underline"
                      >
                        {evidenceLabel(item)}
                      </Link>
                    ) : (
                      <p className="mt-0.5 truncate text-sm text-foreground">
                        {evidenceLabel(item)}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Unlink evidence"
                    onClick={() => setPendingRemove(item)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form className="space-y-3 border-t border-border-subtle pt-4" onSubmit={handleAdd}>
        <h3 className="text-sm font-medium text-foreground">Link evidence</h3>
        <FormField label="Evidence type" htmlFor="evidence-type">
          <select
            id="evidence-type"
            className="ims-select"
            value={evidenceType}
            onChange={(event) =>
              setEvidenceType(event.target.value as ControlEvidenceType)
            }
          >
            {EVIDENCE_TYPE_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        {evidenceType === "risk-management" ||
        evidenceType === "incident-management" ||
        evidenceType === "cip" ? (
          <>
            <FormField label="Search records" htmlFor="evidence-search">
              <Input
                id="evidence-search"
                value={pickerSearch}
                onChange={(event) => setPickerSearch(event.target.value)}
                placeholder="Search by title or reference"
              />
            </FormField>
            <FormField
              label="Select record"
              htmlFor="evidence-record"
              error={fieldError ?? undefined}
              required
            >
              <select
                id="evidence-record"
                className="ims-select"
                value={
                  evidenceType === "risk-management"
                    ? relatedRiskId
                    : evidenceType === "incident-management"
                      ? relatedIncidentId
                      : relatedCipId
                }
                onChange={(event) => {
                  const value = event.target.value;
                  if (evidenceType === "risk-management") setRelatedRiskId(value);
                  if (evidenceType === "incident-management") {
                    setRelatedIncidentId(value);
                  }
                  if (evidenceType === "cip") setRelatedCipId(value);
                }}
              >
                <option value="">Select…</option>
                {pickerOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
          </>
        ) : null}

        {evidenceType === "text-content" ? (
          <FormField
            label="Evidence text"
            htmlFor="evidence-text"
            required
            error={fieldError ?? undefined}
          >
            <Textarea
              id="evidence-text"
              value={textContent}
              onChange={(event) => setTextContent(event.target.value)}
              rows={4}
            />
          </FormField>
        ) : null}

        {evidenceType === "raw-file" ? (
          <>
            <FormField
              label="File name"
              htmlFor="evidence-file-name"
              required
              error={fieldError ?? undefined}
            >
              <Input
                id="evidence-file-name"
                value={fileName}
                onChange={(event) => setFileName(event.target.value)}
              />
            </FormField>
            <FormField label="URL / storage reference" htmlFor="evidence-file-url">
              <Input
                id="evidence-file-url"
                value={fileUrl}
                onChange={(event) => setFileUrl(event.target.value)}
                placeholder="Optional until file upload is available"
              />
            </FormField>
          </>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Linking…" : "Link evidence"}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={Boolean(pendingRemove)}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null);
        }}
        title="Unlink evidence?"
        description="This removes the association with the control. The source record is not deleted."
        confirmLabel="Unlink"
        pending={removeMutation.isPending}
        onConfirm={confirmRemove}
      />
    </div>
  );
}
