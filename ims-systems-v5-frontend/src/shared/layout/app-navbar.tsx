import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import aliceIcon from "@/assets/images/Type=Icon Dark BG.png";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { useAliceChatStore } from "@/modules/ai";
import { GlobalSearch } from "./global-search";
import type { BreadcrumbItem } from "@/shared/navigation";
import { NotificationBell } from "@/modules/notifications";
import { OrganisationSwitcher } from "./organisation-switcher";
import { ThemeSelector } from "./theme-selector";
import { UserMenu } from "./user-menu";

type AppNavbarProps = {
  breadcrumbs: BreadcrumbItem[];
  onMenuClick: () => void;
};

export function AppNavbar({ breadcrumbs, onMenuClick }: AppNavbarProps) {
  const openChat = useAliceChatStore((state) => state.openChat);

  return (
    <header className="sticky top-0 z-30 flex h-[var(--navbar-height)] shrink-0 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur-sm md:px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        aria-label="Open navigation"
        onClick={onMenuClick}
      >
        <Menu className="size-4" />
      </Button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex flex-wrap items-center gap-1.5 text-[0.8125rem]">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <li
                key={`${crumb.label}-${index}`}
                className="flex items-center gap-1.5"
              >
                {index > 0 ? (
                  <span className="text-muted-foreground/50" aria-hidden>
                    /
                  </span>
                ) : null}
                {crumb.href && !isLast ? (
                  <Link
                    to={crumb.href}
                    className="truncate text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "truncate",
                      isLast
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                    )}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          className="inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full ring-offset-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open Alice AI chat"
          title="Alice AI"
          onClick={() => openChat()}
        >
          <img
            src={aliceIcon}
            alt=""
            className="size-8 object-cover"
            width={32}
            height={32}
          />
        </button>
        <GlobalSearch />
        <OrganisationSwitcher />
        <ThemeSelector />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
