import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import { AliceMarkdown } from "@/modules/ai";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import { runAliceTask } from "../api/alice";
import { useApproveAliceDraftMutation, useDiscardAliceDraftMutation } from "../hooks/use-alice";
import { useAliceSheetStore } from "../lib/alice-store";
import type { AliceDraft } from "../types";

type RunState =
  | { phase: "running"; steps: string[] }
  | { phase: "draft"; draft: AliceDraft }
  | { phase: "error"; message: string };

/**
 * ALICE side panel (mounted once in the shell). Runs a task and shows the
 * draft. Drafts that change data wait for a person: Approve applies them
 * through the owning module, Discard drops them. Read-only output (an
 * explanation, a checklist) can be copied.
 */
export function AliceTaskSheet() {
  const request = useAliceSheetStore((s) => s.request);
  const close = useAliceSheetStore((s) => s.close);
  const [state, setState] = useState<RunState | null>(null);
  const [copied, setCopied] = useState(false);
  const approve = useApproveAliceDraftMutation();
  const discard = useDiscardAliceDraftMutation();
  const runId = useRef(0);

  useEffect(() => {
    setCopied(false);
    if (!request) {
      setState(null);
      return;
    }
    if (request.kind === "draft") {
      setState({ phase: "draft", draft: request.draft });
      return;
    }
    const id = ++runId.current;
    const controller = new AbortController();
    setState({ phase: "running", steps: [] });
    runAliceTask({
      task: request.task,
      ref: request.ref,
      signal: controller.signal,
      onStatus: (message) =>
        setState((prev) =>
          id === runId.current && prev?.phase === "running"
            ? { phase: "running", steps: [...prev.steps, message] }
            : prev
        ),
    })
      .then((draft) => {
        if (id === runId.current) setState({ phase: "draft", draft });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || id !== runId.current) return;
        setState({
          phase: "error",
          message: isApiClientError(error) || error instanceof Error ? error.message : "ALICE could not finish",
        });
      });
    return () => controller.abort();
  }, [request]);

  const title = request?.kind === "run" ? request.label : request?.draft.title;
  const draft = state?.phase === "draft" ? state.draft : null;
  const busy = approve.isPending || discard.isPending;

  function onApprove(d: AliceDraft) {
    approve.mutate(d.id, {
      onSuccess: (result) => {
        notify.success(result.appliedMessage ?? "Applied");
        setState({ phase: "draft", draft: result });
      },
      onError: (error) => notify.fromError(error, "Unable to apply the draft"),
    });
  }

  function onDiscard(d: AliceDraft) {
    discard.mutate(d.id, {
      onSuccess: () => {
        notify.info("Draft discarded");
        close();
      },
      onError: (error) => notify.fromError(error, "Unable to discard the draft"),
    });
  }

  async function onCopy(d: AliceDraft) {
    try {
      await navigator.clipboard.writeText(d.markdown);
      setCopied(true);
    } catch {
      notify.error("Copy is not available in this browser");
    }
  }

  return (
    <Sheet open={Boolean(request)} onOpenChange={(open) => !open && close()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border-subtle px-5 py-4">
          <SheetTitle className="flex items-center gap-2 pr-8">
            <Sparkles className="size-4 text-primary" aria-hidden />
            {title ?? "ALICE"}
          </SheetTitle>
          <SheetDescription>
            {draft?.status === "pending"
              ? "Draft from your live data. Nothing changes until you approve it."
              : draft?.status === "approved"
                ? `Approved by ${draft.decidedByName ?? "you"}. ${draft.appliedMessage ?? ""}`
                : "Drafted from your organisation's live compliance data."}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {state?.phase === "running" ? (
            <ul aria-label="ALICE progress" className="space-y-2 text-sm text-muted-foreground">
              {state.steps.map((step) => (
                <li key={step} className="flex items-center gap-2">
                  <Check className="size-3.5 text-success" aria-hidden />
                  {step}
                </li>
              ))}
              <li className="flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                {state.steps.length ? "Working on it…" : "Starting…"}
              </li>
            </ul>
          ) : state?.phase === "error" ? (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          ) : draft ? (
            <AliceMarkdown>{draft.markdown}</AliceMarkdown>
          ) : null}
        </div>

        {draft ? (
          <SheetFooter className="flex-row justify-end gap-2 border-t border-border-subtle px-5 py-3">
            {draft.status === "pending" ? (
              <>
                <Button type="button" variant="ghost" disabled={busy} onClick={() => onDiscard(draft)}>
                  Discard
                </Button>
                <Button type="button" disabled={busy} onClick={() => onApprove(draft)}>
                  {approve.isPending ? "Applying…" : (draft.applyLabel ?? "Approve")}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => void onCopy(draft)}>
                  <Copy className="size-3.5" aria-hidden />
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button type="button" variant="ghost" onClick={close}>
                  Close
                </Button>
              </>
            )}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

/** Small "✦ label" button that opens ALICE for an advice offer. */
export function AskAliceButton({
  task,
  refId,
  label,
  className,
}: {
  task: Parameters<typeof runAliceTask>[0]["task"];
  refId: string | null | undefined;
  label: string;
  className?: string;
}) {
  const open = useAliceSheetStore((s) => s.open);
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={className ?? "h-7 gap-1 rounded-full px-2.5 text-xs text-primary hover:text-primary"}
      title={label}
      onClick={() => open({ kind: "run", task, ref: refId ?? null, label })}
    >
      <Sparkles className="size-3" aria-hidden />
      <span className="truncate">{label}</span>
    </Button>
  );
}
