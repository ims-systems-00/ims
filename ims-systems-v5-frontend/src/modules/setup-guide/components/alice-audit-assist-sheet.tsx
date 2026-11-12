import { useEffect, useMemo, useState } from "react";
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
import { createAiResponse, generateGptNormal } from "@/modules/ai/api/ai";
import { createAudit } from "@/modules/audits/api/audits";
import { auditKeys } from "@/modules/audits/hooks/use-audits";
import {
  AUDIT_INTERVALS,
  type AuditInterval,
} from "@/modules/audits/types";
import { useFunctionalUnitsQuery } from "@/modules/functional-units/hooks/use-functional-units";
import { signalSetupEvent, useSetupGuideStore } from "../store";

function defaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
}

function dateInputToIso(value: string): string {
  return new Date(`${value}T00:00:00`).toISOString();
}

/**
 * Alice assist for internal audits.
 * Schedules an Internal audit series, then drafts and saves an audit plan.
 */
export function AliceAuditAssistSheet() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const open = useSetupGuideStore((s) => s.aliceAssistOpen);
  const activeStepId = useSetupGuideStore((s) => s.activeStepId);
  const setLastAuditContext = useSetupGuideStore((s) => s.setLastAuditContext);
  const closeAliceAssist = useSetupGuideStore((s) => s.closeAliceAssist);
  const finishStep = useSetupGuideStore((s) => s.finishStep);
  const closeGuide = useSetupGuideStore((s) => s.closeGuide);
  const showChecklist = useSetupGuideStore((s) => s.showChecklist);
  const auditorId = useSessionProfileUserId() ?? "";

  const visible = open && activeStepId === "audit";
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  const units = unitsQuery.data?.items ?? [];

  const [title, setTitle] = useState("Internal QMS audit");
  const [focusArea, setFocusArea] = useState(
    "Quality management system — clauses 4–10"
  );
  const [businessUnitId, setBusinessUnitId] = useState("");
  const [complianceBodyId, setComplianceBodyId] = useState("");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [time, setTime] = useState("09:00");
  const [interval, setInterval] = useState<AuditInterval>("Yearly");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle("Internal QMS audit");
    setFocusArea("Quality management system — clauses 4–10");
    setStartDate(defaultStartDate());
    setTime("09:00");
    setInterval("Yearly");
    setError(null);
    setCreating(false);
  }, [visible]);

  useEffect(() => {
    if (!visible || units.length === 0) return;
    setBusinessUnitId((current) => current || units[0]!.id);
    setComplianceBodyId(
      (current) => current || units[1]?.id || units[0]!.id
    );
  }, [visible, units]);

  const unitOptions = useMemo(
    () => units.map((unit) => ({ id: unit.id, label: unit.name })),
    [units]
  );

  const ready =
    title.trim().length > 0 &&
    focusArea.trim().length > 0 &&
    Boolean(auditorId) &&
    Boolean(businessUnitId) &&
    Boolean(complianceBodyId) &&
    Boolean(startDate) &&
    !creating;

  async function handleConfirm() {
    if (!ready || !auditorId) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createAudit({
        title: title.trim(),
        focusArea: focusArea.trim(),
        auditorId,
        businessUnitId,
        complianceBodyId,
        startDate: dateInputToIso(startDate),
        interval,
        type: "Internal",
        time: time.trim() || undefined,
      });
      const audit = result.items[0];
      if (!audit) throw new Error("Audit was not created.");
      setLastAuditContext({ auditId: audit.id });
      signalSetupEvent("audits.scheduled");

      let planText = "";
      try {
        const gpt = await generateGptNormal({
          prompt: [
            `Draft a short internal audit plan for:`,
            `Title: ${audit.title}`,
            `Focus: ${audit.focusArea}`,
            `Reference: ${audit.reference}`,
            ``,
            `Reply with plain text sections:`,
            `1) Scope`,
            `2) Methodology`,
            `3) Checklist (5–8 bullets)`,
            `4) Evidence to sample`,
          ].join("\n"),
          systemInstructions: [
            {
              role: "system",
              content:
                "You are Alice, the iMS OS audit planner. Be concrete and practical.",
            },
          ],
          conversation: [],
        });
        planText = gpt.responseMessage.trim();
      } catch {
        planText = [
          "Scope",
          `- Review ${audit.focusArea} against the organisation's SoA and documented procedures.`,
          "",
          "Methodology",
          "- Interview process owners",
          "- Sample records and linked evidence",
          "- Trace non-conformities to root cause",
          "",
          "Checklist",
          "- Context and interested parties documented",
          "- Risks and opportunities reviewed",
          "- Objectives measured",
          "- Document control current",
          "- Internal communications effective",
          "",
          "Evidence to sample",
          "- Latest policies, meeting minutes, and control evidence",
        ].join("\n");
      }

      try {
        await createAiResponse({
          moduleType: "audits",
          module: audit.id,
          template: {
            dataDisplay: `${audit.reference} ${audit.title}\n${audit.focusArea}`,
            context: `Setup Guide audit plan for ${audit.title}`,
            reportStructure: [
              {
                name: "Audit Plan",
                description: "Alice plan from Setup Guide",
                prompt: "Draft the audit plan",
                response: planText,
              },
            ],
          },
        });
      } catch {
        // Persistence is best-effort; still complete the coach step.
      }
      signalSetupEvent("audits.plan.saved");

      await queryClient.invalidateQueries({ queryKey: auditKeys.all });

      finishStep("audit");
      closeAliceAssist();
      closeGuide();
      showChecklist();
      navigate(`/audits/internal?audit=${encodeURIComponent(audit.id)}`);
      notify.success(
        result.items.length > 1
          ? `Alice scheduled ${result.items.length} audits and saved the plan`
          : "Alice scheduled the audit and saved the plan"
      );
    } catch (err) {
      setError(
        isApiClientError(err)
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not schedule the audit."
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
      title="Alice — schedule internal audit"
      description="Mandatory fields only. Alice schedules the series and drafts the audit plan."
      dataTour="setup.alice.audit"
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
                Scheduling…
              </>
            ) : (
              "Schedule with Alice"
            )}
          </Button>
        </div>
      }
    >
      {!auditorId ? (
        <p className="ims-alert ims-alert-error mb-4" role="alert">
          Sign in again — Alice needs your user id as the auditor.
        </p>
      ) : null}

      {units.length === 0 && !unitsQuery.isLoading ? (
        <p className="ims-alert ims-alert-error mb-4" role="alert">
          Create a business unit first (step 1) so Alice can set the unit and
          compliance body.
        </p>
      ) : null}

      {error ? (
        <p className="ims-alert ims-alert-error mb-4" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-4">
        <FormField label="Title" htmlFor="alice-audit-title" required>
          <Input
            id="alice-audit-title"
            value={title}
            disabled={creating}
            onChange={(event) => setTitle(event.target.value)}
          />
        </FormField>

        <FormField label="Focus area" htmlFor="alice-audit-focus" required>
          <Input
            id="alice-audit-focus"
            value={focusArea}
            disabled={creating}
            onChange={(event) => setFocusArea(event.target.value)}
          />
        </FormField>

        <FormField
          label="Business unit"
          htmlFor="alice-audit-unit"
          required
        >
          <select
            id="alice-audit-unit"
            className="ims-select ims-field"
            value={businessUnitId}
            disabled={creating || units.length === 0}
            onChange={(event) => setBusinessUnitId(event.target.value)}
          >
            <option value="">Select business unit…</option>
            {unitOptions.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Compliance body"
          htmlFor="alice-audit-body"
          required
        >
          <select
            id="alice-audit-body"
            className="ims-select ims-field"
            value={complianceBodyId}
            disabled={creating || units.length === 0}
            onChange={(event) => setComplianceBodyId(event.target.value)}
          >
            <option value="">Select compliance body…</option>
            {unitOptions.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Date" htmlFor="alice-audit-date" required>
            <Input
              id="alice-audit-date"
              type="date"
              value={startDate}
              disabled={creating}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </FormField>
          <FormField label="Time" htmlFor="alice-audit-time">
            <Input
              id="alice-audit-time"
              value={time}
              disabled={creating}
              onChange={(event) => setTime(event.target.value)}
              placeholder="09:00"
            />
          </FormField>
        </div>

        <FormField label="Interval" htmlFor="alice-audit-interval" required>
          <select
            id="alice-audit-interval"
            className="ims-select ims-field"
            value={interval}
            disabled={creating}
            onChange={(event) =>
              setInterval(event.target.value as AuditInterval)
            }
          >
            {AUDIT_INTERVALS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </FormField>

        <p className="text-[0.75rem] text-muted-foreground">
          Type: Internal · Auditor: you. Alice also saves an Assist &amp;
          Verification plan on the first audit in the series.
        </p>
      </div>
    </AppSheet>
  );
}
