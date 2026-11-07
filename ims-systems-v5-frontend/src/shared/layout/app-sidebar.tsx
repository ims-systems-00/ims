import { useMemo } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  buildNavigationSections,
  filterNavigationSections,
  type NavigationLicenceFilter,
} from "@/shared/navigation";
import { Button } from "@/shared/components/ui/button";
import {
  useCurrentOrganisationQuery,
  useOrganisationLogoUrl,
} from "@/modules/organisation/hooks/use-organisations";
import imsOsLogo from "@/assets/images/iMS-OS_horizontal_white.png";
import { SidebarBrand } from "./sidebar-brand";
import {
  permissionAllowed,
  useSecurityCapabilitiesQuery,
} from "@/modules/security/hooks/use-security-capabilities";
import { loadPublicEnv } from "@/shared/lib/env";
import { SidebarNavItem } from "./sidebar-nav-item";

type AppSidebarProps = {
  pathname: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onMobileOpenChange: (open: boolean) => void;
};

export function AppSidebar({
  pathname,
  collapsed,
  mobileOpen,
  onCollapsedChange,
  onMobileOpenChange,
}: AppSidebarProps) {
  const provider = loadPublicEnv().VITE_SECURITY_PROVIDER;
  const capabilitiesQuery = useSecurityCapabilitiesQuery();
  const permissions = capabilitiesQuery.data?.permissions;

  // Licence-gated nav (V4 parity): Auth0 mode shows only licensed
  // toolkits / CRM from the org profile; dev-stub keeps the full catalogue.
  const orgQuery = useCurrentOrganisationQuery(
    provider === "auth0-openfga"
  );
  // Sidebar branding always needs the current org (logo + name), in
  // both security modes; same query key as above, so no duplicate fetch
  // when the licence query is already enabled.
  const brandOrgQuery = useCurrentOrganisationQuery();
  const orgLogoUrl = useOrganisationLogoUrl(brandOrgQuery.data);
  const licenceFilter = useMemo<NavigationLicenceFilter>(() => {
    if (provider !== "auth0-openfga") {
      return { licensedToolkits: null, crmLicensed: null };
    }
    if (!orgQuery.data) {
      return { licensedToolkits: [], crmLicensed: false };
    }
    return {
      licensedToolkits: orgQuery.data.licences.complianceTools ?? [],
      crmLicensed: (orgQuery.data.licences.additionalModules ?? []).includes(
        "CRM"
      ),
    };
  }, [provider, orgQuery.data]);

  const sections = useMemo(() => {
    // Always show Partnership. The dashboard is org-scoped: partners see
    // their referrals; non-partners get the apply CTA for this org.
    return filterNavigationSections(
      buildNavigationSections(licenceFilter),
      (permission) => permissionAllowed(permission, permissions, provider)
    );
  }, [permissions, provider, licenceFilter]);

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/25 md:hidden"
          aria-label="Close navigation overlay"
          onClick={() => onMobileOpenChange(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width,transform] duration-200",
          "border-r border-sidebar-border md:static md:h-full md:translate-x-0",
          collapsed
            ? "md:w-[var(--sidebar-width-collapsed)]"
            : "md:w-[var(--sidebar-width)]",
          mobileOpen
            ? "w-[var(--sidebar-width)] translate-x-0"
            : "-translate-x-full md:translate-x-0"
        )}
        aria-label="Application"
      >
        <div
          className={cn(
            "flex h-[var(--navbar-height)] shrink-0 items-center gap-2.5 px-3",
            "border-b border-sidebar-border",
            collapsed && "md:justify-center md:px-2"
          )}
        >
          {!collapsed ? (
            <SidebarBrand
              logoUrl={orgLogoUrl}
              organisationName={brandOrgQuery.data?.name}
              onNavigate={() => onMobileOpenChange(false)}
            />
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              "hidden text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:inline-flex",
              !collapsed && "ml-auto"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => onCollapsedChange(!collapsed)}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
        </div>

        <nav
          className="flex-1 overflow-y-auto px-2 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Primary"
        >
          {sections.map((section) => (
            <div key={section.id} className="mb-5">
              {!collapsed ? (
                <p className="mb-1.5 px-2.5 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-sidebar-muted">
                  {section.label}
                </p>
              ) : (
                <span className="sr-only">{section.label}</span>
              )}
              <div className="space-y-1.5">
                {section.items.map((item) => (
                  <SidebarNavItem
                    key={item.id}
                    item={item}
                    pathname={pathname}
                    collapsed={collapsed}
                    onNavigate={() => onMobileOpenChange(false)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div
          className={cn(
            "shrink-0 border-t border-sidebar-border p-3",
            collapsed && "md:px-2"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 px-1 py-0.5",
              collapsed ? "md:justify-center" : "justify-start"
            )}
            aria-label="Powered by iMS Systems"
          >
            {!collapsed ? (
              <>
                <span className="shrink-0 text-[0.6875rem] text-sidebar-muted">
                  Powered by
                </span>
                <img
                  src={imsOsLogo}
                  alt="iMS Systems"
                  className="h-5 w-auto max-w-[7.5rem] object-contain opacity-95"
                />
              </>
            ) : (
              <img
                src={imsOsLogo}
                alt="Powered by iMS Systems"
                className="h-4 w-auto max-w-full object-contain opacity-95"
              />
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
