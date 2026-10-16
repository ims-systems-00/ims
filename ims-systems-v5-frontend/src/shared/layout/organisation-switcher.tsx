import { useEffect, useState } from "react";
import { Building2, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { getActiveOrganisationId } from "@/shared/lib/active-organisation";
import { loadPublicEnv } from "@/shared/lib/env";
import { cn } from "@/shared/lib/utils";
import { useMyOrganisationsQuery } from "@/modules/organisation/hooks/use-organisations";
import { useSwitchOrganisationMutation } from "@/modules/organisation/hooks/use-switch-organisation";
import type { Organisation } from "@/modules/organisation/types";

function canSwitchTo(org: Organisation, provider: string): boolean {
  if (provider === "development-stub") return true;
  return Boolean(org.auth0OrganizationId?.trim());
}

/**
 * Navbar organisation switcher (M5).
 * Auth0: acquires a fresh org-scoped token before persisting the active IMS org.
 */
export function OrganisationSwitcher() {
  const provider = loadPublicEnv().VITE_SECURITY_PROVIDER;
  const mineQuery = useMyOrganisationsQuery();
  const switchMutation = useSwitchOrganisationMutation();
  const [activeId, setActiveId] = useState<string | null>(() =>
    getActiveOrganisationId()
  );
  const organisations = mineQuery.data ?? [];
  const active =
    organisations.find((org) => org.id === activeId) ?? organisations[0];

  useEffect(() => {
    setActiveId(getActiveOrganisationId());
  }, [mineQuery.dataUpdatedAt, switchMutation.submittedAt]);

  const label = active?.name ?? (mineQuery.isLoading ? "Loading…" : "Organisation");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="hidden max-w-[14rem] gap-1.5 px-2 sm:inline-flex"
          aria-label="Switch organisation"
          disabled={mineQuery.isLoading || switchMutation.isPending}
        >
          {switchMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-[0.8125rem] font-medium">{label}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="normal-case tracking-normal text-muted-foreground">
          Switch organisation
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organisations.length === 0 ? (
          <DropdownMenuItem disabled>No organisations</DropdownMenuItem>
        ) : (
          organisations.map((org) => {
            const selected = org.id === (active?.id ?? activeId);
            const enabled = canSwitchTo(org, provider);
            return (
              <DropdownMenuItem
                key={org.id}
                disabled={!enabled || switchMutation.isPending || selected}
                title={
                  !enabled
                    ? "Link an Auth0 Organization on this IMS org before switching"
                    : undefined
                }
                onSelect={(event) => {
                  event.preventDefault();
                  if (!enabled || selected) return;
                  void switchMutation
                    .mutateAsync(org)
                    .then(() => setActiveId(org.id))
                    .catch((error: unknown) => {
                      console.error(error);
                    });
                }}
              >
                <Check
                  className={cn(
                    "size-3.5",
                    selected ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{org.name}</span>
              </DropdownMenuItem>
            );
          })
        )}
        {switchMutation.isError ? (
          <>
            <DropdownMenuSeparator />
            <p className="px-2 py-1.5 text-[0.6875rem] text-destructive">
              {switchMutation.error instanceof Error
                ? switchMutation.error.message
                : "Switch failed"}
            </p>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
