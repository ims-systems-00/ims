import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { isApiClientError } from "@/shared/lib/http/errors";
import { loadPublicEnv } from "@/shared/lib/env";
import {
  COMPLIANCE_TOOLKIT_NAMES,
  isComplianceToolkitName,
  toolkitDisplayLabel,
  useCatalogueControlsQuery,
} from "@/modules/compliance";
import { useCurrentOrganisationQuery } from "@/modules/organisation/hooks/use-organisations";
import { applyDocumentComplianceClauses } from "@/modules/document-management/api/document-management";
import {
  documentManagementKeys,
  useDocumentRepositoriesQuery,
  useRepoNodesQuery,
} from "@/modules/document-management/hooks/use-document-management";
import { signalSetupEvent, useSetupGuideStore } from "../store";

/**
 * Alice assist for "Link documents to the standards".
 * Mandatory: repository + document, toolkit, at least one clause.
 */
export function AliceLinkAssistSheet() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const open = useSetupGuideStore((s) => s.aliceAssistOpen);
  const activeStepId = useSetupGuideStore((s) => s.activeStepId);
  const lastDocumentContext = useSetupGuideStore((s) => s.lastDocumentContext);
  const setLastDocumentContext = useSetupGuideStore(
    (s) => s.setLastDocumentContext
  );
  const closeAliceAssist = useSetupGuideStore((s) => s.closeAliceAssist);
  const finishStep = useSetupGuideStore((s) => s.finishStep);
  const closeGuide = useSetupGuideStore((s) => s.closeGuide);
  const showChecklist = useSetupGuideStore((s) => s.showChecklist);

  const visible = open && activeStepId === "link";

  const isAuth0Mode =
    loadPublicEnv().VITE_SECURITY_PROVIDER === "auth0-openfga";
  const orgQuery = useCurrentOrganisationQuery(isAuth0Mode);
  const availableToolkits = useMemo(() => {
    if (!isAuth0Mode) return [...COMPLIANCE_TOOLKIT_NAMES];
    const licensed = (orgQuery.data?.licences.complianceTools ?? []).filter(
      (name): name is string => isComplianceToolkitName(name)
    );
    return licensed.length > 0 ? licensed : [...COMPLIANCE_TOOLKIT_NAMES];
  }, [isAuth0Mode, orgQuery.data?.licences.complianceTools]);

  const reposQuery = useDocumentRepositoriesQuery({
    page: 1,
    pageSize: 50,
    sort: "createdOn",
    sortDir: "desc",
  });
  const repos = reposQuery.data?.items ?? [];

  const [repositoryId, setRepositoryId] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [toolkitId, setToolkitId] = useState("ISO 9001");
  const [clauseIds, setClauseIds] = useState<string[]>(["4.1"]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nodesQuery = useRepoNodesQuery(repositoryId || undefined, {
    page: 1,
    pageSize: 50,
    type: "document",
    sort: "createdOn",
    sortDir: "desc",
  });
  const documents = nodesQuery.data?.items ?? [];

  const catalogueQuery = useCatalogueControlsQuery(
    toolkitId || undefined,
    { page: 1, pageSize: 40 },
    visible && Boolean(toolkitId)
  );
  const catalogueItems = catalogueQuery.data?.items ?? [];

  useEffect(() => {
    if (!visible) return;
    const preferredRepo =
      lastDocumentContext?.repositoryId || repos[0]?.id || "";
    setRepositoryId(preferredRepo);
    setToolkitId(availableToolkits[0] ?? "ISO 9001");
    setClauseIds(["4.1"]);
    setError(null);
    setCreating(false);
  }, [visible, lastDocumentContext, repos, availableToolkits]);

  useEffect(() => {
    if (!visible || !repositoryId) return;
    const preferredNode =
      lastDocumentContext?.repositoryId === repositoryId
        ? lastDocumentContext.nodeId
        : documents[0]?.id || "";
    setNodeId(preferredNode);
  }, [visible, repositoryId, documents, lastDocumentContext]);

  function toggleClause(clause: string) {
    setClauseIds((current) =>
      current.includes(clause)
        ? current.filter((id) => id !== clause)
        : [...current, clause]
    );
  }

  const ready =
    Boolean(repositoryId) &&
    Boolean(nodeId) &&
    Boolean(toolkitId) &&
    clauseIds.length > 0 &&
    !creating;

  async function handleConfirm() {
    if (!ready) return;
    setCreating(true);
    setError(null);
    try {
      await applyDocumentComplianceClauses(repositoryId, nodeId, {
        toolkitId,
        clauseIds,
      });
      setLastDocumentContext({ repositoryId, nodeId });
      signalSetupEvent("docs.compliance.linked");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: documentManagementKeys.all,
        }),
        queryClient.invalidateQueries({ queryKey: ["compliance"] }),
      ]);
      finishStep("link");
      closeAliceAssist();
      closeGuide();
      showChecklist();
      navigate(
        `/documents/repositories/${repositoryId}/nodes/${nodeId}?tab=compliance-settings`
      );
      notify.success(
        `Linked to ${toolkitDisplayLabel(toolkitId)} (${clauseIds.length} clause${clauseIds.length === 1 ? "" : "s"})`
      );
    } catch (err) {
      setError(
        isApiClientError(err)
          ? err.message
          : "Could not link the document to compliance clauses."
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
      title="Alice — link documents to standards"
      description="Pick a document, standard and clauses. Alice attaches the document as evidence."
      dataTour="setup.alice.link"
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
                Linking…
              </>
            ) : (
              "Link with Alice"
            )}
          </Button>
        </div>
      }
    >
      {error ? (
        <p className="ims-alert ims-alert-error mb-4" role="alert">
          {error}
        </p>
      ) : null}

      {repos.length === 0 && !reposQuery.isLoading ? (
        <p className="mb-4 text-sm text-muted-foreground">
          No repositories yet. Finish “Bring your compliance in” first, or
          create a repository manually.
        </p>
      ) : null}

      <div className="space-y-4">
        <FormField label="Repository" htmlFor="alice-link-repo" required>
          <select
            id="alice-link-repo"
            className="ims-select ims-field"
            value={repositoryId}
            disabled={creating || repos.length === 0}
            onChange={(event) => setRepositoryId(event.target.value)}
          >
            <option value="">Select repository…</option>
            {repos.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Document" htmlFor="alice-link-doc" required>
          <select
            id="alice-link-doc"
            className="ims-select ims-field"
            value={nodeId}
            disabled={creating || !repositoryId || documents.length === 0}
            onChange={(event) => setNodeId(event.target.value)}
          >
            <option value="">Select document…</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Standard" htmlFor="alice-link-toolkit" required>
          <select
            id="alice-link-toolkit"
            className="ims-select ims-field"
            value={toolkitId}
            disabled={creating}
            onChange={(event) => {
              setToolkitId(event.target.value);
              setClauseIds([]);
            }}
          >
            {availableToolkits.map((name) => (
              <option key={name} value={name}>
                {toolkitDisplayLabel(name)}
              </option>
            ))}
          </select>
        </FormField>

        <div className="space-y-2">
          <p className="ims-text-label">
            Clauses <span className="text-destructive">*</span>
          </p>
          {catalogueQuery.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Loading catalogue…
            </p>
          ) : catalogueItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No clauses found for this standard. Enter a clause id below or
              pick another toolkit.
            </p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
              {catalogueItems.slice(0, 30).map((control) => {
                const checked = clauseIds.includes(control.clause);
                return (
                  <li key={control.clause}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/40">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 rounded border-border"
                        checked={checked}
                        disabled={creating}
                        onChange={() => toggleClause(control.clause)}
                      />
                      <span>
                        <span className="font-medium">{control.clause}</span>
                        <span className="block text-[0.75rem] text-muted-foreground">
                          {control.title}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <FormField
            label="Or type clause ids (comma-separated)"
            htmlFor="alice-link-clauses"
          >
            <input
              id="alice-link-clauses"
              className="ims-field"
              value={clauseIds.join(", ")}
              disabled={creating}
              onChange={(event) =>
                setClauseIds(
                  event.target.value
                    .split(",")
                    .map((part) => part.trim())
                    .filter(Boolean)
                )
              }
              placeholder="4.1, 4.2"
            />
          </FormField>
        </div>
      </div>
    </AppSheet>
  );
}
