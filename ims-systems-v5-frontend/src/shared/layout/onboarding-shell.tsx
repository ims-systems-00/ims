import { Link, Outlet, useLocation } from "react-router-dom";
import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { ThemeSelector } from "./theme-selector";
import { UserMenu } from "./user-menu";

const STEPS = [
  { label: "Organisation", hint: "Your details", match: "/onboard/organisation" },
  { label: "Choose path", hint: "Go Live or partner", match: "/onboard/flow-selection" },
  { label: "Go Live", hint: "Licences & payment", match: "/onboard/go-live" },
] as const;

function currentStepIndex(pathname: string): number {
  const index = STEPS.findIndex((step) => pathname.startsWith(step.match));
  return index === -1 ? 0 : index;
}

/**
 * Premium, minimal onboarding shell — no app sidebar or module navigation.
 * Workspace access is only available after Go Live (customer activation).
 */
export function OnboardingShell() {
  const location = useLocation();
  const activeStep = currentStepIndex(location.pathname);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(60rem_30rem_at_50%_-10rem,color-mix(in_oklch,var(--primary)_7%,transparent),transparent)]"
      />

      <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 md:px-6">
          <Link
            to="/onboard/organisation"
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            <span
              aria-hidden
              className="flex size-8 items-center justify-center rounded-lg bg-primary text-[0.8125rem] font-bold tracking-tight text-primary-foreground"
            >
              i
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-tight">
                iMS Systems
              </span>
              <span className="block text-[0.6875rem] text-muted-foreground">
                Organisation setup
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-1.5">
            <ThemeSelector />
            <UserMenu />
          </div>
        </div>

        <nav
          aria-label="Onboarding progress"
          className="mx-auto w-full max-w-5xl px-4 pb-4 md:px-6"
        >
          <ol className="flex items-start">
            {STEPS.map((step, index) => {
              const done = index < activeStep;
              const active = index === activeStep;
              return (
                <li
                  key={step.label}
                  className={cn("flex items-start", index < STEPS.length - 1 && "flex-1")}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border text-[0.6875rem] font-semibold transition-colors",
                        done &&
                          "border-primary bg-primary text-primary-foreground",
                        active &&
                          "border-primary text-primary ring-4 ring-primary/10",
                        !done && !active && "border-border text-muted-foreground"
                      )}
                    >
                      {done ? <Check className="size-3.5" /> : index + 1}
                    </span>
                    <span className="hidden leading-tight sm:block">
                      <span
                        className={cn(
                          "block text-[0.75rem] font-medium",
                          active ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {step.label}
                      </span>
                      <span className="block text-[0.6875rem] text-muted-foreground">
                        {step.hint}
                      </span>
                    </span>
                  </div>
                  {index < STEPS.length - 1 ? (
                    <span
                      aria-hidden
                      className={cn(
                        "mx-3 mt-3.5 h-px flex-1",
                        done ? "bg-primary" : "bg-border"
                      )}
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </nav>
      </header>

      <main className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-8 md:px-6 md:py-10">
        <Outlet />
      </main>

      <footer className="relative border-t border-border-subtle px-4 py-4">
        <p className="mx-auto w-full max-w-5xl text-center text-[0.6875rem] text-muted-foreground">
          Your workspace unlocks after Go Live. Need help? Contact
          support@imssystems.tech
        </p>
      </footer>
    </div>
  );
}
