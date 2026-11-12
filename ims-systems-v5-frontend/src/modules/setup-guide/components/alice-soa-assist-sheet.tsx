import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { notify } from "@/shared/lib/toast";
import { isApiClientError } from "@/shared/lib/http/errors";
import { loadPublicEnv } from "@/shared/lib/env";
import {
  COMPLIANCE_TOOLKIT_NAMES,
  isComplianceToolkitName,
  toolkitDisplayLabel,
  toolkitPath,
  type ComplianceToolkitName,
  type ControlStatus,
} from "@/modules/compliance";
import {
  createControlEvidence,
  listComplianceControls,
  provisionComplianceToolkit,
  updateComplianceControlStatus,
} from "@/modules/compliance/api/compliance";
import { complianceKeys } from "@/modules/compliance/hooks/use-compliance";
import { useCurrentOrganisationQuery } from "@/modules/organisation/hooks/use-organisations";
import { signalSetupEvent, useSetupGuideStore } from "../store";

/**
 * Alice assist for Statement of Applicability.
 * Provisions toolkit if needed, selects a leaf control, sets Implemented,
 * attaches text or document evidence.
 */
export function AliceSoaAssistSheet() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const open = useSetupGuideStore((s) => s.aliceAssistOpen);
  const activeStepId = useSetupGuideStore((s) => s.activeStepId);
  const lastDocumentContext = useSetupGuideStore((s) => s.lastDocumentContext);
  const closeAliceAssist = useSetupGuideStore((s) => s.closeAliceAssist);
  const finishStep = useSetupGuideStore((s) => s.finishStep);
  const closeGuide = useSetupGuideStore((s) => s.closeGuide);
  const showChecklist = useSetupGuideStore((s) => s.showChecklist);

  const visible = open && activeStepId === "soa";

  const isAuth0Mode =
    loadPublicEnv().VITE_SECURITY_PROVIDER === "auth0-openfga";
  const orgQuery = useCurrentOrganisationQuery(isAuth0Mode);
  const availableToolkits = useMemo(() => {
    if (!isAuth0Mode) return [...COMPLIANCE_TOOLKIT_NAMES];
    const licensed = (orgQuery.data?.licences.complianceTools ?? []).filter(
      (name): name is ComplianceToolkitName => isComplianceToolkitName(name)
    );
    return licensed.length > 0 ? licensed : [...COMPLIANCE_TOOLKIT_NAMES];
  }, [isAuth0Mode, orgQuery.data?.licences.complianceTools]);

  const [toolkitId, setToolkitId] = useState<ComplianceToolkitName>("ISO 9001");
  const [evidenceNote, setEvidenceNote] = useState(
    "Starter SoA evidence from Alice during Setup Guide. Replace with controlled evidence when ready."
  );
  const [useLinkedDocument, setUseLinkedDocument] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const preferred = availableToolkits.includes("ISO 9001")
      ? "ISO 9001"
      : (availableToolkits[0] ?? "ISO 9001");
    setToolkitId(preferred as ComplianceToolkitName);
    setEvidenceNote(
      "Starter SoA evidence from Alice during Setup Guide. Replace with controlled evidence when ready."
    );
    setUseLinkedDocument(Boolean(lastDocumentContext?.nodeId));
    setError(null);
    setCreating(false);
  }, [visible, availableToolkits, lastDocumentContext]);

  const ready =
    Boolean(toolkitId) && evidenceNote.trim().length > 0 && !creating;

  async function pickLeafControl(
    name: ComplianceToolkitName
  ): Promise<ControlStatus> {
    const page = await listComplianceControls(name, {
      page: 1,
      pageSize: 50,
      sort: "clause",
      sortDir: "asc",
    });
    const leaf =
      page.items.find((control) => !control.isLocked) ?? page.items[0];
    if (!leaf) {
      throw new Error(
        "No controls found for this toolkit. Activate it from Compliance first."
      );
    }
    return leaf;
  }

  async function handleConfirm() {
    if (!ready) return;
    setCreating(true);
    setError(null);
    try {
      try {
        await provisionComplianceToolkit(toolkitId);
      } catch (err) {
        // Already provisioned is fine — continue.
        if (!(isApiClientError(err) && err.status === 409)) {
          // Some backends return 400 when already present; still try listing.
          const message = isApiClientError(err) ? err.message : "";
          if (!/already|exist|provisioned/i.test(message)) {
            // Continue; list will fail clearly if toolkit is missing.
          }
        }
      }

      const control = await pickLeafControl(toolkitId);
      await updateComplianceControlStatus(control.id, {
        selected: "Selected",
        state: "Implemented",
      });
      signalSetupEvent("soa.control.status-updated");
      signalSetupEvent("soa.control.selected");

      if (useLinkedDocument && lastDocumentContext?.nodeId) {
        await createControlEvidence(control.id, {
          evidenceType: "document-management",
          relatedDocumentId: lastDocumentContext.nodeId,
          textContent: evidenceNote.trim() || undefined,
        });
      } else {
        await createControlEvidence(control.id, {
          evidenceType: "text-content",
          textContent: evidenceNote.trim(),
        });
      }
      signalSetupEvent("soa.evidence.attached");

      await queryClient.invalidateQueries({ queryKey: complianceKeys.all });

      finishStep("soa");
      closeAliceAssist();
      closeGuide();
      showChecklist();
      navigate(
        `${toolkitPath(toolkitId)}?tab=toolkit&control=${encodeURIComponent(control.id)}`
      );
      notify.success(
        `Alice selected ${control.clause} on ${toolkitDisplayLabel(toolkitId)} and attached evidence`
      );
    } catch (err) {
      setError(
        isApiClientError(err)
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not update the Statement of Applicability."
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
      title="Alice — Statement of Applicability"
      description="Pick a standard. Alice selects a clause, sets Implemented, and attaches evidence so the score moves."
      dataTour="setup.alice.soa"
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
                Updating SoA…
              </>
            ) : (
              "Update with Alice"
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

      <div className="space-y-4">
        <FormField label="Standard" htmlFor="alice-soa-toolkit" required>
          <select
            id="alice-soa-toolkit"
            className="ims-select ims-field"
            value={toolkitId}
            disabled={creating}
            onChange={(event) =>
              setToolkitId(event.target.value as ComplianceToolkitName)
            }
          >
            {availableToolkits.map((name) => (
              <option key={name} value={name}>
                {toolkitDisplayLabel(name)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Evidence note"
          htmlFor="alice-soa-evidence"
          required
        >
          <Textarea
            id="alice-soa-evidence"
            className="min-h-[5rem]"
            value={evidenceNote}
            disabled={creating}
            onChange={(event) => setEvidenceNote(event.target.value)}
          />
        </FormField>

        {lastDocumentContext?.nodeId ? (
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-border"
              checked={useLinkedDocument}
              disabled={creating}
              onChange={(event) => setUseLinkedDocument(event.target.checked)}
            />
            <span>
              Also link the document from the previous setup step as evidence
              <span className="mt-0.5 block text-[0.75rem] text-muted-foreground">
                Document id {lastDocumentContext.nodeId.slice(0, 8)}…
              </span>
            </span>
          </label>
        ) : (
          <p className="text-[0.75rem] text-muted-foreground">
            Alice will attach a text evidence note. Link a policy in step 3 to
            offer document evidence here.
          </p>
        )}

        <p className="text-[0.75rem] text-muted-foreground">
          Alice picks the first unlocked clause, marks it Selected /
          Implemented, then attaches evidence.
        </p>
      </div>
    </AppSheet>
  );
}
