import { NavLink } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { cn } from "@/shared/lib/utils";
import {
  isNavBranchActive,
  isNavItemActive,
  type NavItem,
} from "@/shared/navigation";

type SidebarNavItemProps = {
  item: NavItem;
  pathname: string;
  collapsed?: boolean;
  depth?: number;
  onNavigate?: () => void;
};

export function SidebarNavItem({
  item,
  pathname,
  collapsed = false,
  depth = 0,
  onNavigate,
}: SidebarNavItemProps) {
  const hasChildren = Boolean(item.children?.length);
  const branchActive = isNavBranchActive(pathname, item);
  const [open, setOpen] = useState(branchActive);
  const panelId = useId();
  const Icon = item.icon;

  useEffect(() => {
    if (branchActive) setOpen(true);
  }, [branchActive]);

  const baseItem =
    "group relative flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-[0.9rem] transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary";

  if (hasChildren) {
    return (
      <div className="space-y-1.5">
        <button
          type="button"
          className={cn(
            baseItem,
            "text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            branchActive && "text-sidebar-accent-foreground",
            collapsed && "justify-center px-2"
          )}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
          title={collapsed ? item.label : undefined}
          onClick={() => setOpen((value) => !value)}
        >
          {Icon ? (
            <Icon className="size-[0.9375rem] shrink-0 opacity-80" aria-hidden />
          ) : null}
          {!collapsed ? (
            <>
              <span className="flex-1 truncate text-left font-medium">
                {item.label}
              </span>
              <ChevronDown
                className={cn(
                  "size-3.5 shrink-0 text-sidebar-muted transition-transform duration-150",
                  open && "rotate-180"
                )}
                aria-hidden
              />
            </>
          ) : null}
        </button>
        {!collapsed && open ? (
          <div id={panelId} className="space-y-0.5 pl-1" role="group">
            {item.children!.map((child) => (
              <SidebarNavItem
                key={child.id}
                item={child}
                pathname={pathname}
                depth={depth + 1}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (!item.href || item.disabled) {
    return (
      <div
        className={cn(
          baseItem,
          "cursor-default text-sidebar-muted",
          depth > 0 && "pl-8",
          collapsed && "justify-center px-2"
        )}
        title={item.label}
        aria-disabled="true"
      >
        {Icon ? (
          <Icon className="size-[0.9375rem] shrink-0 opacity-60" aria-hidden />
        ) : null}
        {!collapsed ? <span className="truncate">{item.label}</span> : null}
        {!collapsed && item.placeholder ? (
          <span className="ml-auto text-[0.5625rem] font-medium uppercase tracking-wider opacity-70">
            Soon
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <NavLink
      to={item.href}
      end={item.href === "/"}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => {
        const active = isActive || isNavItemActive(pathname, item.href);
        return cn(
          baseItem,
          "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          depth > 0 && "relative pl-8",
          active &&
            "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-sidebar-primary",
          collapsed && "justify-center px-2 before:hidden"
        );
      }}
    >
      {({ isActive }) => (
        <>
          {depth > 0 && !collapsed ? (
            <span
              className={cn(
                "absolute left-3.5 top-1/2 size-1 -translate-y-1/2 rounded-full bg-sidebar-muted",
                (isActive || isNavItemActive(pathname, item.href)) &&
                  "bg-sidebar-primary"
              )}
              aria-hidden
            />
          ) : null}
          {Icon ? (
            <Icon
              className="size-[0.9375rem] shrink-0 opacity-80"
              aria-hidden
            />
          ) : null}
          {!collapsed ? <span className="truncate">{item.label}</span> : null}
        </>
      )}
    </NavLink>
  );
}
