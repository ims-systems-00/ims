import { CheckCircle2, CircleHelp, Lock } from "lucide-react";
import { loadPublicEnv } from "@/shared/lib/env";
import {
  permissionAllowed,
  useSecurityCapabilitiesQuery,
} from "@/modules/security/hooks/use-security-capabilities";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { cn } from "@/shared/lib/utils";
import { SETUP_GUIDE_CATALOG } from "../catalog";
import { useSetupGuideStore } from "../store";

/**
 * Choose which Setup Guide tour to start.
 */
export function ModulePickerDialog() {
  const open = useSetupGuideStore((s) => s.pickerOpen);
  const closePicker = useSetupGuideStore((s) => s.closePicker);
  const startTour = useSetupGuideStore((s) => s.startTour);
  const completedTours = useSetupGuideStore((s) => s.completedTours);
  const capabilitiesQuery = useSecurityCapabilitiesQuery(open);
  const provider = loadPublicEnv().VITE_SECURITY_PROVIDER;
  const permissions = capabilitiesQuery.data?.permissions;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closePicker()}>
      <DialogContent className="max-w-lg" showClose>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleHelp className="size-4 text-primary" aria-hidden />
            Setup Guide
          </DialogTitle>
          <DialogDescription>
            Pick a module. The guide walks you through its real screens,
            highlighting one control at a time, and waits when it is your turn
            to try something. Leave any time with Esc.
          </DialogDescription>
        </DialogHeader>

        <ul className="mt-1 max-h-[min(28rem,60vh)] space-y-2 overflow-y-auto pr-1">
          {SETUP_GUIDE_CATALOG.map((entry) => {
            const allowed = permissionAllowed(
              entry.requiredPermission,
              permissions,
              provider
            );
            const available =
              entry.status === "available" && Boolean(entry.tourId);
            const locked = available && !allowed;
            const done = entry.tourId
              ? Boolean(completedTours[entry.tourId])
              : false;
            const disabled = !available || locked;

            return (
              <li key={entry.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (!entry.tourId || disabled) return;
                    startTour(entry.tourId);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-md border border-border-subtle bg-surface px-3.5 py-3 text-left transition-colors",
                    disabled
                      ? "cursor-not-allowed opacity-60"
                      : "hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                >
                  <span className="mt-0.5 shrink-0 text-muted-foreground">
                    {locked ? (
                      <Lock className="size-4" aria-hidden />
                    ) : done ? (
                      <CheckCircle2
                        className="size-4 text-primary"
                        aria-hidden
                      />
                    ) : (
                      <CircleHelp className="size-4" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {entry.title}
                      </span>
                      {entry.status === "coming_soon" ? (
                        <Badge variant="secondary">Coming soon</Badge>
                      ) : null}
                      {done ? (
                        <Badge variant="secondary">Completed</Badge>
                      ) : null}
                      {locked ? (
                        <Badge variant="secondary">No access</Badge>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-muted-foreground">
                      {locked
                        ? "Ask an admin for access to this module, then try again."
                        : entry.description}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex justify-end pt-1">
          <Button type="button" variant="outline" onClick={closePicker}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
