import { useMemo } from "react";
import { Link } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  filterNavigationSections,
  navigationSections,
} from "@/shared/navigation";
import { Button } from "@/shared/components/ui/button";
import {
  permissionAllowed,
  useSecurityCapabilitiesQuery,
} from "@/modules/security/hooks/use-security-capabilities";
import { UserAvatar } from "@/modules/users/components/user-avatar";
import { useSessionUserQuery } from "@/modules/users/hooks/use-users";
import {
  DEV_STUB_IDENTITY,
  resolveProfileUserId,
} from "@/security";
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
  const stubProfileId =
    provider === "development-stub"
      ? resolveProfileUserId(DEV_STUB_IDENTITY)
      : undefined;
  const userQuery = useSessionUserQuery(stubProfileId);
  const user = userQuery.data?.user;
  const displayName =
    user?.name ??
    (provider === "auth0-openfga" ? "Signed in" : "Dev user");
  const displayEmail =
    user?.email ??
    (provider === "development-stub"
      ? (DEV_STUB_IDENTITY.email ?? "Session")
      : "Session");

  const sections = useMemo(
    () =>
      filterNavigationSections(navigationSections, (permission) =>
        permissionAllowed(permission, permissions, provider)
      ),
    [permissions, provider]
  );

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
            <Link
              to="/"
              className="flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary"
              onClick={() => onMobileOpenChange(false)}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-sidebar-primary text-[0.625rem] font-semibold tracking-wide text-sidebar">
                iMS
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[0.8125rem] font-semibold tracking-[-0.01em]">
                  IMS Systems
                </span>
                <span className="block truncate text-[0.6875rem] text-sidebar-muted">
                  Platform V5
                </span>
              </span>
            </Link>
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
              "flex items-center gap-2.5 px-1 py-0.5",
              collapsed && "md:justify-center"
            )}
          >
            <UserAvatar
              name={displayName}
              imageUrl={user?.profileImage?.url}
              size="sm"
              className="size-7 rounded-sm"
            />
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-[0.8125rem] font-medium">
                  {displayName}
                </p>
                <p className="truncate text-[0.6875rem] text-sidebar-muted">
                  {displayEmail}
                </p>
              </div>
            ) : (
              <span className="sr-only">{`${displayName}, ${displayEmail}`}</span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
