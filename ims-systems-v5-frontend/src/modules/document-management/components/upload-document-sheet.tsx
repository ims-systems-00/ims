import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { DEV_STUB_IDENTITY } from "@/security";
import { uploadFileViaHandler } from "@/modules/files";
import { useCreateFileNodesMutation } from "../hooks/use-document-management";
import { uploadDocumentFormSchema } from "../schemas";
import {
  DOCUMENT_APPLICABLE_MODULE_LABELS,
  DOCUMENT_APPLICABLE_MODULES,
  DOCUMENT_PURPOSE_LABELS,
  DOCUMENT_PURPOSES,
  type DocumentApplicableModule,
  type DocumentPurpose,
} from "../types";

type UploadDocumentSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repositoryId: string;
  parentNodeId: string | null;
};

export function UploadDocumentSheet({
  open,
  onOpenChange,
  repositoryId,
  parentNodeId,
}: UploadDocumentSheetProps) {
  const createMutation = useCreateFileNodesMutation(repositoryId);
  const [files, setFiles] = useState<FileList | null>(null);
  const [purpose, setPurpose] = useState<DocumentPurpose>("Document");
  const [modules, setModules] = useState<DocumentApplicableModule[]>([]);
  const [requireAuthorisation, setRequireAuthorisation] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  function reset() {
    setFiles(null);
    setPurpose("Document");
    setModules([]);
    setRequireAuthorisation(false);
    setFormError(undefined);
  }

  function toggleModule(module: DocumentApplicableModule) {
    setModules((current) =>
      current.includes(module)
        ? current.filter((item) => item !== module)
        : [...current, module]
    );
  }

  async function handleSubmit() {
    const parsed = uploadDocumentFormSchema.safeParse({
      purpose,
      applicableModules: modules,
      requireAuthorisation,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message);
      return;
    }
    if (!files || files.length === 0) {
      setFormError("Select at least one file");
      return;
    }

    setUploading(true);
    try {
      const payloads = [];
      for (const file of Array.from(files)) {
        const storageInfo = await uploadFileViaHandler(file, "general");
        payloads.push({
          storageInfo,
          purpose: parsed.data.purpose,
          applicableModules: parsed.data.applicableModules,
          authorisation: parsed.data.requireAuthorisation
            ? [DEV_STUB_IDENTITY.subjectId]
            : [],
        });
      }

      const result = await createMutation.mutateAsync({
        parentNodeId,
        data: payloads,
      });

      if (result.created.length > 0) {
        notify.success(
          result.created.length === 1
            ? "Document uploaded"
            : `${result.created.length} documents uploaded`
        );
      }
      if (result.skipped.length > 0) {
        notify.error(
          `Skipped existing names: ${result.skipped.join(", ")}`
        );
      }
      reset();
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to upload document");
    } finally {
      setUploading(false);
    }
  }

  const pending = uploading || createMutation.isPending;
  const fileCount = files?.length ?? 0;

  return (
    <AppSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title="Upload documents"
      description="Files go through File Handler, then register as managed documents in this folder."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            Upload
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <FormField
          label="Files"
          htmlFor="doc-files"
          required
          error={formError}
          description={
            fileCount > 0
              ? `${fileCount} file${fileCount === 1 ? "" : "s"} selected`
              : "You can upload multiple files in one go."
          }
        >
          <Input
            id="doc-files"
            type="file"
            multiple
            onChange={(event) => {
              setFiles(event.target.files);
              setFormError(undefined);
            }}
          />
        </FormField>

        <FormField label="Purpose" htmlFor="doc-purpose" required>
          <select
            id="doc-purpose"
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

        <FormField
          label="Applicable modules"
          description="Used by pickers in other modules."
        >
          <div className="flex flex-wrap gap-1.5">
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

        <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border-subtle px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/30">
          <input
            type="checkbox"
            className="mt-0.5 size-3.5 accent-primary"
            checked={requireAuthorisation}
            onChange={(event) =>
              setRequireAuthorisation(event.target.checked)
            }
          />
          <span>
            <span className="block font-medium">Require authorisation</span>
            <span className="mt-0.5 block text-[0.75rem] text-muted-foreground">
              You must approve before the document can be published.
            </span>
          </span>
        </label>
      </div>
    </AppSheet>
  );
}
