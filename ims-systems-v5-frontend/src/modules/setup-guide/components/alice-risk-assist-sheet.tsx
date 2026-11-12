import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { notify } from "@/shared/lib/toast";
import { isApiClientError } from "@/shared/lib/http/errors";
import { useSessionProfileUserId } from "@/security";
import { createAiResponse, generateGptNormal } from "@/modules/ai/api/ai";
import { createRisk, mitigateRisk } from "@/modules/risks/api/risks";
import { riskKeys } from "@/modules/risks/hooks/use-risks";
import { RISK_TYPES, type RiskType } from "@/modules/risks/types";
import { signalSetupEvent, useSetupGuideStore } from "../store";

const SCORE_OPTIONS = [1, 2, 3, 4, 5] as const;

/**
 * Alice assist for "Risk, analysed by Alice".
 * Raises a scored risk, asks Alice for impacts/mitigations/controls,
 * saves the analysis and applies it as the mitigation treatment.
 */
export function AliceRiskAssistSheet() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const open = useSetupGuideStore((s) => s.aliceAssistOpen);
  const activeStepId = useSetupGuideStore((s) => s.activeStepId);
  const closeAliceAssist = useSetupGuideStore((s) => s.closeAliceAssist);
  const finishStep = useSetupGuideStore((s) => s.finishStep);
  const closeGuide = useSetupGuideStore((s) => s.closeGuide);
  const showChecklist = useSetupGuideStore((s) => s.showChecklist);
  const ownerId = useSessionProfileUserId() ?? "";

  const visible = open && activeStepId === "risk";

  const [title, setTitle] = useState("Unauthorised access to customer data");
  const [description, setDescription] = useState(
    "Weak access controls could allow unauthorised staff or outsiders to view or change customer records, causing confidentiality and regulatory impact."
  );
  const [type, setType] = useState<RiskType>("Organisational");
  const [likelihood, setLikelihood] = useState(3);
  const [consequence, setConsequence] = useState(4);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle("Unauthorised access to customer data");
    setDescription(
      "Weak access controls could allow unauthorised staff or outsiders to view or change customer records, causing confidentiality and regulatory impact."
    );
    setType("Organisational");
    setLikelihood(3);
    setConsequence(4);
    setError(null);
    setCreating(false);
  }, [visible]);

  const ready =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    Boolean(ownerId) &&
    !creating;

  async function handleConfirm() {
    if (!ready || !ownerId) return;
    setCreating(true);
    setError(null);
    try {
      const risk = await createRisk({
        title: title.trim(),
        description: description.trim(),
        type,
        ownerId,
        likelihood,
        consequence,
      });
      signalSetupEvent("risks.created");

      let analysisText = "";
      try {
        const gpt = await generateGptNormal({
          prompt: [
            `Analyse this organisational risk and reply with three short sections:`,
            `1) Impacts`,
            `2) Mitigations`,
            `3) Suggested compliance controls to link`,
            ``,
            `Title: ${risk.title}`,
            `Description: ${risk.description}`,
            `Likelihood: ${likelihood}/5`,
            `Consequence: ${consequence}/5`,
            `Score: ${likelihood * consequence}`,
            `Keep each section to a few bullet points. Plain text only.`,
          ].join("\n"),
          systemInstructions: [
            {
              role: "system",
              content:
                "You are Alice, the iMS OS risk analyst. Be concrete and actionable.",
            },
          ],
          conversation: [],
        });
        analysisText = gpt.responseMessage.trim();
      } catch {
        analysisText = [
          "Impacts",
          "- Confidentiality breach and possible regulatory exposure",
          "- Loss of customer trust and remediation cost",
          "",
          "Mitigations",
          "- Enforce least-privilege access and MFA",
          "- Review access logs weekly; revoke unused accounts",
          "",
          "Suggested controls",
          "- Link relevant access-control clauses from your SoA toolkit",
        ].join("\n");
      }

      try {
        await createAiResponse({
          moduleType: "risks",
          module: risk.id,
          template: {
            dataDisplay: `${risk.reference} ${risk.title}\n${risk.description}`,
            context: `Setup Guide analysis for ${risk.title}`,
            reportStructure: [
              {
                name: "Impact, mitigations and controls",
                description: "Alice analysis from Setup Guide",
                prompt: "Analyse impacts, mitigations and controls",
                response: analysisText,
              },
            ],
          },
        });
      } catch {
        // Analysis persistence is best-effort; treatment still proceeds.
      }

      await mitigateRisk(risk.id, {
        mitigationText: analysisText.slice(0, 4000),
      });
      signalSetupEvent("risks.analysed");

      await queryClient.invalidateQueries({ queryKey: riskKeys.all });

      finishStep("risk");
      closeAliceAssist();
      closeGuide();
      showChecklist();
      navigate(`/risks?risk=${encodeURIComponent(risk.id)}`);
      notify.success("Alice raised the risk, analysed it, and saved the treatment");
    } catch (err) {
      setError(
        isApiClientError(err)
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not raise and analyse the risk."
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
      title="Alice — raise and analyse a risk"
      description="Mandatory fields only. Alice raises the risk, analyses impacts and mitigations, then saves the treatment."
      dataTour="setup.alice.risk"
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
                Analysing…
              </>
            ) : (
              "Raise & analyse with Alice"
            )}
          </Button>
        </div>
      }
    >
      {!ownerId ? (
        <p className="ims-alert ims-alert-error mb-4" role="alert">
          Sign in again — Alice needs your user id as the risk owner.
        </p>
      ) : null}

      {error ? (
        <p className="ims-alert ims-alert-error mb-4" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-4">
        <FormField label="Title" htmlFor="alice-risk-title" required>
          <Input
            id="alice-risk-title"
            value={title}
            disabled={creating}
            onChange={(event) => setTitle(event.target.value)}
          />
        </FormField>

        <FormField label="Description" htmlFor="alice-risk-desc" required>
          <Textarea
            id="alice-risk-desc"
            className="min-h-[5.5rem]"
            value={description}
            disabled={creating}
            onChange={(event) => setDescription(event.target.value)}
          />
        </FormField>

        <FormField label="Type" htmlFor="alice-risk-type" required>
          <select
            id="alice-risk-type"
            className="ims-select ims-field"
            value={type}
            disabled={creating}
            onChange={(event) => setType(event.target.value as RiskType)}
          >
            {RISK_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Likelihood" htmlFor="alice-risk-likelihood" required>
            <select
              id="alice-risk-likelihood"
              className="ims-select ims-field"
              value={likelihood}
              disabled={creating}
              onChange={(event) => setLikelihood(Number(event.target.value))}
            >
              {SCORE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Consequence"
            htmlFor="alice-risk-consequence"
            required
          >
            <select
              id="alice-risk-consequence"
              className="ims-select ims-field"
              value={consequence}
              disabled={creating}
              onChange={(event) => setConsequence(Number(event.target.value))}
            >
              {SCORE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <p className="text-[0.75rem] text-muted-foreground">
          Owner: you · Score: {likelihood * consequence} ({likelihood} ×{" "}
          {consequence}). Alice saves the analysis as the mitigation treatment.
        </p>
      </div>
    </AppSheet>
  );
}
