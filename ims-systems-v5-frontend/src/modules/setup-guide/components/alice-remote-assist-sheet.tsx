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
import { createFunctionalUnit } from "@/modules/functional-units/api/functional-units";
import { functionalUnitKeys } from "@/modules/functional-units/hooks/use-functional-units";
import { createInvitation } from "@/modules/invitations/api/invitations";
import { invitationKeys } from "@/modules/invitations/hooks/use-invitations";
import { signalSetupEvent, useSetupGuideStore } from "../store";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Alice assist for "Remote audit ready".
 * Creates an External compliance function + External Auditor invitation.
 */
export function AliceRemoteAssistSheet() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const open = useSetupGuideStore((s) => s.aliceAssistOpen);
  const activeStepId = useSetupGuideStore((s) => s.activeStepId);
  const closeAliceAssist = useSetupGuideStore((s) => s.closeAliceAssist);
  const finishStep = useSetupGuideStore((s) => s.finishStep);
  const closeGuide = useSetupGuideStore((s) => s.closeGuide);
  const showChecklist = useSetupGuideStore((s) => s.showChecklist);

  const visible = open && activeStepId === "remote";

  const [bodyName, setBodyName] = useState("BSI Group");
  const [standards, setStandards] = useState("ISO 9001, ISO 27001");
  const [responsibility, setResponsibility] = useState(
    "External certification and surveillance audits — read-only remote access."
  );
  const [auditorEmail, setAuditorEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setBodyName("BSI Group");
    setStandards("ISO 9001, ISO 27001");
    setResponsibility(
      "External certification and surveillance audits — read-only remote access."
    );
    setAuditorEmail("");
    setError(null);
    setCreating(false);
  }, [visible]);

  const ready =
    bodyName.trim().length > 0 &&
    standards.trim().length > 0 &&
    responsibility.trim().length > 0 &&
    EMAIL_PATTERN.test(auditorEmail.trim().toLowerCase()) &&
    !creating;

  async function handleConfirm() {
    if (!ready) return;
    setCreating(true);
    setError(null);
    try {
      const unit = await createFunctionalUnit({
        name: bodyName.trim(),
        accessType: "External compliance function",
        responsibility: responsibility.trim(),
        standards: standards.trim(),
      });
      signalSetupEvent("remote.fu.created");
      signalSetupEvent("org.fu.created");

      const email = auditorEmail.trim().toLowerCase();
      await createInvitation({
        email,
        role: "External Auditor",
      });
      signalSetupEvent("org.users.invited");
      signalSetupEvent("remote.auditor.invited");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: functionalUnitKeys.all }),
        queryClient.invalidateQueries({ queryKey: invitationKeys.all }),
      ]);

      finishStep("remote");
      closeAliceAssist();
      closeGuide();
      showChecklist();
      navigate("/users?tab=invitations");
      notify.success(
        `Alice registered ${unit.name} and invited ${email} as External Auditor`
      );
    } catch (err) {
      setError(
        isApiClientError(err)
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not prepare remote audit access."
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
      title="Alice — remote audit ready"
      description="Create the certification body as an External compliance function and invite your lead auditor."
      dataTour="setup.alice.remote"
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
                Preparing…
              </>
            ) : (
              "Prepare with Alice"
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

      <div className="space-y-5">
        <section className="space-y-3 rounded-lg border border-border px-3.5 py-3">
          <p className="text-sm font-semibold text-foreground">
            Certification body
          </p>
          <FormField label="Name" htmlFor="alice-remote-body" required>
            <Input
              id="alice-remote-body"
              value={bodyName}
              disabled={creating}
              onChange={(event) => setBodyName(event.target.value)}
            />
          </FormField>
          <FormField label="Standards" htmlFor="alice-remote-standards" required>
            <Input
              id="alice-remote-standards"
              value={standards}
              disabled={creating}
              onChange={(event) => setStandards(event.target.value)}
              placeholder="ISO 9001, ISO 27001"
            />
          </FormField>
          <FormField
            label="Responsibility"
            htmlFor="alice-remote-responsibility"
            required
          >
            <Textarea
              id="alice-remote-responsibility"
              className="min-h-[4.5rem]"
              value={responsibility}
              disabled={creating}
              onChange={(event) => setResponsibility(event.target.value)}
            />
          </FormField>
          <p className="text-[0.75rem] text-muted-foreground">
            Access type: External compliance function
          </p>
        </section>

        <section className="space-y-3 rounded-lg border border-border px-3.5 py-3">
          <p className="text-sm font-semibold text-foreground">Lead auditor</p>
          <FormField
            label="Email"
            htmlFor="alice-remote-email"
            required
          >
            <Input
              id="alice-remote-email"
              type="email"
              value={auditorEmail}
              disabled={creating}
              onChange={(event) => setAuditorEmail(event.target.value)}
              placeholder="lead.auditor@certbody.com"
            />
          </FormField>
          <p className="text-[0.75rem] text-muted-foreground">
            Role: External Auditor — read-only login, live evidence, no exports.
          </p>
        </section>
      </div>
    </AppSheet>
  );
}
