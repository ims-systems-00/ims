import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type AuthEntryLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
};

/**
 * Dedicated auth chrome (no app sidebar) — V5 owns look & feel.
 */
export function AuthEntryLayout({
  title,
  description,
  children,
}: AuthEntryLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex h-[var(--navbar-height)] items-center border-b border-border px-4 md:px-6">
        <Link to="/login" className="text-sm font-semibold tracking-tight">
          iMS Systems
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-[0.875rem] text-muted-foreground">{description}</p>
          </div>
          <section className="ims-panel overflow-hidden px-5 py-6">
            {children}
          </section>
        </div>
      </main>
    </div>
  );
}
