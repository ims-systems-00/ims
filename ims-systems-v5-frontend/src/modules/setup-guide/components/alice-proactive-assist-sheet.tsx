import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { Button } from "@/shared/components/ui/button";
import { useAliceChatStore } from "@/modules/ai/store/use-alice-chat-store";
import { ALICE_MONDAY_QUESTION } from "../catalog";
import { signalSetupEvent, useSetupGuideStore } from "../store";

/**
 * Alice assist for "Alice manages it proactively".
 * Opens the float chat, pins the Monday question, and queues it to send.
 */
export function AliceProactiveAssistSheet() {
  const navigate = useNavigate();
  const open = useSetupGuideStore((s) => s.aliceAssistOpen);
  const activeStepId = useSetupGuideStore((s) => s.activeStepId);
  const closeAliceAssist = useSetupGuideStore((s) => s.closeAliceAssist);
  const finishStep = useSetupGuideStore((s) => s.finishStep);
  const closeGuide = useSetupGuideStore((s) => s.closeGuide);
  const showChecklist = useSetupGuideStore((s) => s.showChecklist);

  const openFloat = useAliceChatStore((s) => s.openFloat);
  const pinPrompt = useAliceChatStore((s) => s.pinPrompt);
  const queueSend = useAliceChatStore((s) => s.queueSend);

  const visible = open && activeStepId === "alice";
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!visible) setWorking(false);
  }, [visible]);

  function handleConfirm() {
    setWorking(true);
    navigate("/");
    openFloat();
    pinPrompt(ALICE_MONDAY_QUESTION);
    queueSend(ALICE_MONDAY_QUESTION);
    signalSetupEvent("alice.opened");
    signalSetupEvent("alice.asked");
    signalSetupEvent("alice.pinned");
    finishStep("alice");
    closeAliceAssist();
    closeGuide();
    showChecklist();
  }

  return (
    <AppSheet
      open={visible}
      onOpenChange={(next) => {
        if (!next) closeAliceAssist();
      }}
      title="Alice — manage it proactively"
      description="Alice opens her chat, asks what needs attention this week, and pins that as your Monday question."
      dataTour="setup.alice.proactive"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={working}
            onClick={() => closeAliceAssist()}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={working}
            onClick={handleConfirm}
          >
            {working ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                Opening Alice…
              </>
            ) : (
              "Ask Alice"
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Alice will open in the bottom-right chat and ask:
        </p>
        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-foreground">
          “{ALICE_MONDAY_QUESTION}”
        </p>
        <p>
          That question is pinned so you can re-run it every Monday. Open any
          records she links when she answers.
        </p>
      </div>
    </AppSheet>
  );
}
