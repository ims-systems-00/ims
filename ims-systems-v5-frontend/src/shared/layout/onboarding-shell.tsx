import { Link, Outlet } from "react-router-dom";
import { ThemeSelector } from "./theme-selector";
import { UserMenu } from "./user-menu";

/**
 * Minimal shell for organisation onboarding (create / flow / go-live).
 * No app sidebar or module navigation — matches V4 `/auth/onboard/*` feel.
 */
export function OnboardingShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-[var(--navbar-height)] shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur-sm md:px-6">
        <Link
          to="/onboard/organisation"
          className="text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          iMS · Organisation setup
        </Link>
        <div className="flex items-center gap-1.5">
          <ThemeSelector />
          <UserMenu />
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 md:px-6 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
