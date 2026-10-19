import type { NavItem, NavSection } from "./types";

function filterItem(
  item: NavItem,
  allowed: (permission: string | undefined) => boolean
): NavItem | null {
  if (!allowed(item.requiredPermission)) {
    return null;
  }

  if (!item.children?.length) {
    return item;
  }

  const children = item.children
    .map((child) => filterItem(child, allowed))
    .filter((child): child is NavItem => child !== null);

  // Keep group if it has an href of its own or surviving children.
  if (item.href || children.length > 0) {
    return { ...item, children: children.length > 0 ? children : undefined };
  }
  return null;
}

/**
 * Drop nav items the session cannot read (Auth0 capabilities).
 * Stub provider should pass `() => true`.
 */
export function filterNavigationSections(
  sections: NavSection[],
  allowed: (permission: string | undefined) => boolean
): NavSection[] {
  return sections
    .map((section) => {
      const items = section.items
        .map((item) => filterItem(item, allowed))
        .filter((item): item is NavItem => item !== null);
      return { ...section, items };
    })
    .filter((section) => section.items.length > 0);
}
