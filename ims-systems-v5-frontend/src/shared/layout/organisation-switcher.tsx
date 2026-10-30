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
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { ensureOrganisationAuth0Link } from "@/modules/organisation/api/organisations";
import { useMyOrganisationsQuery } from "@/modules/organisation/hooks/use-organisations";
import { useSwitchOrganisationMutation } from "@/modules/organisation/hooks/use-switch-organisation";
import type { Organisation } from "@/modules/organisation/types";

function needsAuth0Link(org: Organisation, provider: string): boolean {
  if (provider === "development-stub") return false;
  return !org.auth0OrganizationId?.trim();
}

/**
 * Navbar organisation switcher (M5).
 * Auth0: acquires a fresh org-scoped token before persisting the active IMS org.
 * Orgs missing Auth0 linkage are still clickable — we attempt ensure-auth0-link first.
 */
export function OrganisationSwitcher() {
  const provider = loadPublicEnv().VITE_SECURITY_PROVIDER;
  const mineQuery = useMyOrganisationsQuery();
  const switchMutation = useSwitchOrganisationMutation();
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(() =>
    getActiveOrganisationId()
  );
  const organisations = mineQuery.data ?? [];
  const active =
    organisations.find((org) => org.id === activeId) ?? organisations[0];
  const busy = switchMutation.isPending || linkingId !== null;

  useEffect(() => {
    setActiveId(getActiveOrganisationId());
  }, [mineQuery.dataUpdatedAt, switchMutation.submittedAt]);

  const label = active?.name ?? (mineQuery.isLoading ? "Loading…" : "Organisation");

  async function switchTo(org: Organisation) {
    let target = org;
    if (needsAuth0Link(org, provider)) {
      setLinkingId(org.id);
      try {
        const linked = await ensureOrganisationAuth0Link(org.id);
        target = linked;
        await mineQuery.refetch();
      } catch (error) {
        notify.fromError(
          error,
          "This organisation is not linked to Auth0 yet, so it cannot be switched to"
        );
        setLinkingId(null);
        return;
      } finally {
        setLinkingId(null);
      }
    }

    try {
      await switchMutation.mutateAsync(target);
      setActiveId(target.id);
      // Full navigation refresh so org-scoped modules remount cleanly.
      // Non-customer / non-partner orgs land on flow-selection via the gate.
      window.location.assign("/");
    } catch (error) {
      notify.fromError(error, "Unable to switch organisation");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="inline-flex max-w-[14rem] gap-1.5 px-2"
          aria-label="Switch organisation"
          disabled={mineQuery.isLoading || busy}
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-[0.8125rem] font-medium">{label}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="normal-case tracking-normal text-muted-foreground">
          Switch organisation
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organisations.length === 0 ? (
          <DropdownMenuItem disabled>No organisations</DropdownMenuItem>
        ) : (
          organisations.map((org) => {
            const selected = org.id === (active?.id ?? activeId);
            const unlinked = needsAuth0Link(org, provider);
            return (
              <DropdownMenuItem
                key={org.id}
                disabled={busy || selected}
                onSelect={(event) => {
                  event.preventDefault();
                  if (selected || busy) return;
                  void switchTo(org);
                }}
              >
                <Check
                  className={cn(
                    "size-3.5 shrink-0",
                    selected ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{org.name}</span>
                  {unlinked ? (
                    <span className="block text-[0.65rem] text-amber-700 dark:text-amber-400">
                      Auth0 not linked — click to link &amp; switch
                    </span>
                  ) : null}
                </span>
                {linkingId === org.id ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                ) : null}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
