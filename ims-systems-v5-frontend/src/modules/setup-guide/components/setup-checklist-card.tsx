import { useNavigate } from "react-router-dom";
import { Check, CircleHelp, Lock } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { loadPublicEnv } from "@/shared/lib/env";
import { cn } from "@/shared/lib/utils";
import {
  permissionAllowed,
  useSecurityCapabilitiesQuery,
} from "@/modules/security/hooks/use-security-capabilities";
import {
  SETUP_GUIDE_ESTIMATE,
  SETUP_GUIDE_TITLE,
  SETUP_STEPS,
} from "../catalog";
import {
  completedCount,
  nextUndoneStepId,
  useSetupGuideStore,
} from "../store";

/**
 * Large setup-guide popup — progress, step list, Continue / Ask Alice.
 * Mounted from {@link SetupGuideHost}; opened via navbar / sidebar.
 */
export function SetupChecklistCard() {
  const navigate = useNavigate();
  const open = useSetupGuideStore((s) => s.checklistOpen);
  const completedSteps = useSetupGuideStore((s) => s.completedSteps);
  const hideChecklist = useSetupGuideStore((s) => s.hideChecklist);
  const closeChecklist = useSetupGuideStore((s) => s.closeChecklist);
  const startStep = useSetupGuideStore((s) => s.startStep);
  const openAliceAssist = useSetupGuideStore((s) => s.openAliceAssist);
  const capabilitiesQuery = useSecurityCapabilitiesQuery();
  const provider = loadPublicEnv().VITE_SECURITY_PROVIDER;
  const permissions = capabilitiesQuery.data?.permissions;

  const done = completedCount(completedSteps);
  const total = SETUP_STEPS.length;
  const nextId = nextUndoneStepId(completedSteps);
  const progressDeg = Math.round((done / total) * 360);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeChecklist();
      }}
    >
      <DialogContent
        showClose
        className="flex max-h-[min(92vh,52rem)] w-[calc(100%-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100%-2rem)]"
        aria-describedby="setup-guide-checklist-desc"
      >
        <DialogHeader className="shrink-0 border-b border-border-subtle bg-gradient-to-br from-primary/5 via-surface-elevated to-surface-elevated px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-4 pr-6">
            <div
              className="grid size-16 shrink-0 place-items-center rounded-full"
              style={{
                background: `conic-gradient(var(--primary) ${progressDeg}deg, color-mix(in oklab, var(--primary) 18%, transparent) 0)`,
              }}
              aria-hidden
            >
              <span className="grid size-[3.125rem] place-items-center rounded-full bg-surface text-sm font-bold text-foreground">
                {done}/{total}
              </span>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <DialogTitle
                id="setup-guide-checklist-title"
                className="text-base font-semibold tracking-tight"
              >
                {SETUP_GUIDE_TITLE}
              </DialogTitle>
              <DialogDescription id="setup-guide-checklist-desc">
                A friendly path through the modules that matter —{" "}
                {SETUP_GUIDE_ESTIMATE}.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => hideChecklist()}
            >
              Hide for now
            </Button>
          </div>
        </DialogHeader>

        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-4 sm:px-6">
          {SETUP_STEPS.map((step, index) => {
            const isDone = Boolean(completedSteps[step.id]);
            const isNext = step.id === nextId;
            const available = step.status === "available";
            const allowed = permissionAllowed(
              step.requiredPermission,
              permissions,
              provider
            );
            const locked = available && !allowed;
            const canRun = available && !locked;

            return (
              <li
                key={step.id}
                className={cn(
                  "grid grid-cols-[1.625rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5",
                  isNext &&
                    "border-primary/30 bg-surface shadow-sm ring-1 ring-primary/15"
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-[1.625rem] items-center justify-center rounded-full border-2 text-[0.7rem] font-bold",
                    isDone
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-primary/40 text-primary"
                  )}
                  aria-hidden
                >
                  {isDone ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : (
                    index + 1
                  )}
                </span>

                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-semibold text-foreground",
                      isDone && "text-muted-foreground"
                    )}
                  >
                    {step.title}
                    <span className="ml-2 font-mono text-[0.65rem] font-normal uppercase tracking-wide text-muted-foreground">
                      {step.estimate}
                    </span>
                  </p>
                  <p className="truncate text-[0.8125rem] text-muted-foreground">
                    {locked
                      ? "Ask an admin for access to this module."
                      : step.summary}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {step.status === "coming_soon" ? (
                    <Badge variant="secondary">Coming soon</Badge>
                  ) : null}
                  {locked ? (
                    <Badge variant="secondary">
                      <Lock className="size-3" aria-hidden />
                      No access
                    </Badge>
                  ) : null}
                  {isDone ? <Badge variant="secondary">Done</Badge> : null}
                  {canRun ? (
                    <>
                      {step.aliceCapable ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-pink-300/60 text-pink-700 hover:bg-pink-50 dark:text-pink-300 dark:hover:bg-pink-950/40"
                          onClick={() => {
                            startStep(step.id);
                            navigate(step.route);
                            openAliceAssist();
                          }}
                        >
                          Ask Alice
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant={isDone ? "outline" : "default"}
                        onClick={() => {
                          startStep(step.id);
                          navigate(step.route);
                        }}
                      >
                        {isDone
                          ? "Replay"
                          : isNext && done > 0
                            ? "Continue"
                            : "Start"}
                      </Button>
                    </>
                  ) : null}
                  {!available && !isDone ? (
                    <CircleHelp
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
