import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
  breadcrumbsForPath,
  navigationSections,
} from "@/shared/navigation";
import { NotificationPopupQueue } from "@/modules/notifications";
import { AppNavbar } from "./app-navbar";
import { AppSidebar } from "./app-sidebar";
import { MainContent } from "./page-header";

/**
 * Reusable authenticated application shell.
 * Business modules render via <Outlet /> and must not own this layout.
 */
export function ApplicationShell() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const breadcrumbs = breadcrumbsForPath(pathname, navigationSections);

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <AppSidebar
        pathname={pathname}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCollapsedChange={setCollapsed}
        onMobileOpenChange={setMobileOpen}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppNavbar
          breadcrumbs={breadcrumbs}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 md:px-6 md:py-6">
          <MainContent>
            <Outlet />
          </MainContent>
        </main>
      </div>
      <NotificationPopupQueue />
    </div>
  );
}
