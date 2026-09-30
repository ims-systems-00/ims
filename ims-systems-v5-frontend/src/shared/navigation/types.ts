import type { LucideIcon } from "lucide-react";

/**
 * Typed navigation model for the application shell.
 * Add new module routes here as modules ship — do not hardcode nav JSX.
 */
export type NavItem = {
  id: string;
  label: string;
  /** Route path when this item is navigable. Omit for group-only nodes. */
  href?: string;
  icon?: LucideIcon;
  children?: NavItem[];
  /**
   * Optional future authorization metadata.
   * Not enforced by the shell yet (Auth0/OpenFGA deferred).
   */
  requiredPermission?: string;
  /** Visually available but not navigable (future module placeholder). */
  disabled?: boolean;
  /** Marks placeholder entries in the config (not a live module). */
  placeholder?: boolean;
};

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

export type BreadcrumbItem = {
  label: string;
  href?: string;
};
