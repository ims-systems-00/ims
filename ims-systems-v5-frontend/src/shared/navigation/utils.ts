import type { BreadcrumbItem, NavItem, NavSection } from "./types";

export function isNavItemActive(pathname: string, href?: string): boolean {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavBranchActive(pathname: string, item: NavItem): boolean {
  if (isNavItemActive(pathname, item.href)) return true;
  return (item.children ?? []).some((child) =>
    isNavBranchActive(pathname, child)
  );
}

export function flattenNavItems(sections: NavSection[]): NavItem[] {
  const items: NavItem[] = [];

  function walk(list: NavItem[]) {
    for (const item of list) {
      items.push(item);
      if (item.children?.length) walk(item.children);
    }
  }

  for (const section of sections) {
    walk(section.items);
  }

  return items;
}

/**
 * Builds breadcrumbs from the navigation tree for the current path.
 */
export function breadcrumbsForPath(
  pathname: string,
  sections: NavSection[]
): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [{ label: "Dashboard", href: "/" }];

  if (pathname === "/") {
    return crumbs;
  }

  for (const section of sections) {
    for (const item of section.items) {
      const match = findActiveTrail(item, pathname);
      if (match) {
        return [...crumbs, ...match];
      }
    }
  }

  // Account routes are navbar-only (not in the sidebar tree).
  if (pathname === "/profile" || pathname.startsWith("/profile/")) {
    return [...crumbs, { label: "My Profile", href: "/profile" }];
  }
  if (pathname === "/organisation" || pathname.startsWith("/organisation/")) {
    return [...crumbs, { label: "My organisation", href: "/organisation" }];
  }
  if (pathname.startsWith("/onboard/")) {
    // Onboarding uses OnboardingShell (no product breadcrumbs).
    return [];
  }

  return crumbs;
}

function findActiveTrail(
  item: NavItem,
  pathname: string
): BreadcrumbItem[] | null {
  if (item.children?.length) {
    // Longest href first so a specific child (e.g. /documents/signatures)
    // wins over a prefix sibling (e.g. /documents).
    const ordered = [...item.children].sort(
      (a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0)
    );
    for (const child of ordered) {
      const nested = findActiveTrail(child, pathname);
      if (nested) {
        return [
          {
            label: item.label,
            href: item.href,
          },
          ...nested,
        ];
      }
    }
  }

  if (isNavItemActive(pathname, item.href)) {
    return [{ label: item.label, href: item.href }];
  }

  return null;
}

export function pageTitleForPath(
  pathname: string,
  sections: NavSection[]
): string {
  const crumbs = breadcrumbsForPath(pathname, sections);
  return crumbs[crumbs.length - 1]?.label ?? "IMS Systems";
}
