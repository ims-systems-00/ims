import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type WizardStepId = 1 | 2 | 3 | 4;

type WizardStepsProps = {
  /** Highest step the user can meaningfully work on. */
  current: WizardStepId;
  /** Steps that are complete enough to leave. */
  completed: WizardStepId[];
};

const STEPS: Array<{ id: WizardStepId; label: string }> = [
  { id: 1, label: "Configure" },
  { id: 2, label: "Map" },
  { id: 3, label: "Validate" },
  { id: 4, label: "Migrate" },
];

/**
 * Compact wizard progress strip for the Data Import page.
 */
export function WizardSteps({ current, completed }: WizardStepsProps) {
  return (
    <ol className="flex flex-wrap items-center gap-2 sm:gap-3">
      {STEPS.map((step, index) => {
        const isComplete = completed.includes(step.id);
        const isCurrent = current === step.id;
        return (
          <li key={step.id} className="flex items-center gap-2 sm:gap-3">
            {index > 0 ? (
              <span
                className="hidden h-px w-4 bg-border sm:block sm:w-6"
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                isComplete &&
                  "border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300",
                isCurrent &&
                  !isComplete &&
                  "border-primary/40 bg-primary/10 text-foreground",
                !isCurrent &&
                  !isComplete &&
                  "border-border bg-surface-muted/40 text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full text-[0.625rem]",
                  isComplete
                    ? "bg-emerald-600 text-white"
                    : isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-muted text-muted-foreground"
                )}
              >
                {isComplete ? <Check className="size-2.5" aria-hidden /> : step.id}
              </span>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
