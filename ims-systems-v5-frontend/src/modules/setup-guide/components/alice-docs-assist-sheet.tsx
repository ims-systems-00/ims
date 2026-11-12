import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/toast";
import { isApiClientError } from "@/shared/lib/http/errors";
import { useSessionProfileUserId } from "@/security";
import { uploadFileViaHandler } from "@/modules/files";
import {
  createDocumentRepository,
  createFileNodes,
} from "@/modules/document-management/api/document-management";
import { documentManagementKeys } from "@/modules/document-management/hooks/use-document-management";
import {
  DOCUMENT_PURPOSE_LABELS,
  DOCUMENT_PURPOSES,
  type DocumentPurpose,
} from "@/modules/document-management/types";
import { signalSetupEvent, useSetupGuideStore } from "../store";

function defaultReviewDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function buildPolicyFile(title: string): File {
  const body = [
    `${title}`,
    "",
    "This starter policy was created by Alice during Setup Guide.",
    "Replace it with your controlled document when ready.",
    "",
    `Created: ${new Date().toISOString()}`,
  ].join("\n");
  return new File([body], `${title.replace(/\s+/g, "-").toLowerCase()}.txt`, {
    type: "text/plain",
  });
}

/**
 * Alice assist for "Bring your compliance in".
 * Mandatory create fields only: repository name; document purpose, review date,
 * authorisation flag (owner = current user). Uploads a small starter policy file.
 */
export function AliceDocsAssistSheet() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const open = useSetupGuideStore((s) => s.aliceAssistOpen);
  const activeStepId = useSetupGuideStore((s) => s.activeStepId);
  const closeAliceAssist = useSetupGuideStore((s) => s.closeAliceAssist);
  const finishStep = useSetupGuideStore((s) => s.finishStep);
  const closeGuide = useSetupGuideStore((s) => s.closeGuide);
  const showChecklist = useSetupGuideStore((s) => s.showChecklist);
  const setLastDocumentContext = useSetupGuideStore(
    (s) => s.setLastDocumentContext
  );
  const setLastRepositoryContext = useSetupGuideStore(
    (s) => s.setLastRepositoryContext
  );
  const ownerId = useSessionProfileUserId() ?? "";

  const visible = open && activeStepId === "docs";

  const [repoName, setRepoName] = useState("Policies & Procedures");
  const [docTitle, setDocTitle] = useState("Information Security Policy");
  const [purpose, setPurpose] = useState<DocumentPurpose>("Policy");
  const [reviewDate, setReviewDate] = useState(defaultReviewDate);
  const [requireAuthorisation, setRequireAuthorisation] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setRepoName("Policies & Procedures");
    setDocTitle("Information Security Policy");
    setPurpose("Policy");
    setReviewDate(defaultReviewDate());
    setRequireAuthorisation(false);
    setError(null);
    setCreating(false);
  }, [visible]);

  const ready =
    repoName.trim().length > 0 &&
    docTitle.trim().length > 0 &&
    Boolean(ownerId) &&
    !creating;

  async function handleConfirm() {
    if (!ready || !ownerId) return;
    setCreating(true);
    setError(null);
    try {
      const repo = await createDocumentRepository({
        name: repoName.trim(),
        privacy: "Organisational",
        owners: [ownerId],
        reviewInterval: "Yearly",
        description: "Created by Alice during Setup Guide.",
      });
      signalSetupEvent("docs.repo.created");

      const file = buildPolicyFile(docTitle.trim());
      const storageInfo = await uploadFileViaHandler(file, "general");
      // Ensure the stored name matches the policy title the user set.
      const namedStorage = {
        ...storageInfo,
        Name: `${docTitle.trim()}.txt`,
      };

      const result = await createFileNodes(repo.id, {
        data: [
          {
            storageInfo: namedStorage,
            purpose,
            owners: [ownerId],
            reviewDate: new Date(`${reviewDate}T00:00:00.000Z`).toISOString(),
            authorisation: requireAuthorisation ? [ownerId] : [],
            applicableModules: ["compliancecontrols"],
            complianceTools: ["ISO9001"],
          },
        ],
      });

      const node = result.created[0];
      if (!node) {
        throw new Error(
          result.skipped.length
            ? `Document name already exists: ${result.skipped.join(", ")}`
            : "Document was not created."
        );
      }

      signalSetupEvent("docs.document.created");
      setLastRepositoryContext({ repositoryId: repo.id });
      setLastDocumentContext({ repositoryId: repo.id, nodeId: node.id });
      await queryClient.invalidateQueries({
        queryKey: documentManagementKeys.all,
      });

      finishStep("docs");
      closeAliceAssist();
      closeGuide();
      showChecklist();
      navigate(`/documents/repositories/${repo.id}/nodes/${node.id}`);
      notify.success(
        "Alice created your policies repository and a starter policy"
      );
    } catch (err) {
      setError(
        isApiClientError(err)
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not create repository and document."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppSheet
      open={visible}
      onOpenChange={(next) => {
        if (!next) closeAliceAssist();
      }}
      title="Alice — bring your compliance in"
      description="Mandatory fields only. Alice creates the repository and uploads a starter policy file for you."
      dataTour="setup.alice.docs"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={creating}
            onClick={() => closeAliceAssist()}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!ready}
            onClick={() => {
              void handleConfirm();
            }}
          >
            {creating ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                Creating…
              </>
            ) : (
              "Create with Alice"
            )}
          </Button>
        </div>
      }
    >
      {!ownerId ? (
        <p className="ims-alert ims-alert-error mb-4" role="alert">
          Sign in again — Alice needs your user id as the document owner.
        </p>
      ) : null}

      {error ? (
        <p className="ims-alert ims-alert-error mb-4" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-5">
        <section className="space-y-3 rounded-lg border border-border px-3.5 py-3">
          <p className="text-sm font-semibold text-foreground">Repository</p>
          <FormField label="Name" htmlFor="alice-docs-repo-name" required>
            <Input
              id="alice-docs-repo-name"
              value={repoName}
              disabled={creating}
              onChange={(event) => setRepoName(event.target.value)}
            />
          </FormField>
          <p className="text-[0.75rem] text-muted-foreground">
            Privacy: Organisational · Owner: you · Review interval: Yearly
          </p>
        </section>

        <section className="space-y-3 rounded-lg border border-border px-3.5 py-3">
          <p className="text-sm font-semibold text-foreground">Starter policy</p>
          <FormField label="Document title" htmlFor="alice-docs-title" required>
            <Input
              id="alice-docs-title"
              value={docTitle}
              disabled={creating}
              onChange={(event) => setDocTitle(event.target.value)}
            />
          </FormField>
          <FormField label="Purpose" htmlFor="alice-docs-purpose" required>
            <select
              id="alice-docs-purpose"
              className="ims-select ims-field"
              value={purpose}
              disabled={creating}
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
            label="Review date"
            htmlFor="alice-docs-review"
            required
          >
            <Input
              id="alice-docs-review"
              type="date"
              value={reviewDate}
              disabled={creating}
              onChange={(event) => setReviewDate(event.target.value)}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              checked={requireAuthorisation}
              disabled={creating}
              onChange={(event) =>
                setRequireAuthorisation(event.target.checked)
              }
            />
            Require authorisation (sign-off) before publish
          </label>
          <p className="text-[0.75rem] text-muted-foreground">
            Owner: you. Alice uploads a short text starter file you can replace
            later.
          </p>
        </section>
      </div>
    </AppSheet>
  );
}
