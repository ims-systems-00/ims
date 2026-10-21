import { describe, expect, it } from "vitest";
import { buildNavigationSections } from "@/shared/navigation";
import type { NavItem } from "@/shared/navigation";

function flatten(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => [
    item,
    ...(item.children ? flatten(item.children) : []),
  ]);
}

function allItems() {
  return buildNavigationSections({
    licensedToolkits: null,
    crmLicensed: null,
  }).flatMap((section) => flatten(section.items));
}

describe("buildNavigationSections licence filtering", () => {
  it("shows the full catalogue when no licence filter applies", () => {
    const items = allItems();
    const compliance = items.find((item) => item.id === "compliance");
    expect(compliance?.children?.length).toBeGreaterThan(10);
    expect(items.some((item) => item.id === "crm")).toBe(true);
  });

  it("shows only licensed toolkits and hides CRM when unlicensed", () => {
    const sections = buildNavigationSections({
      licensedToolkits: ["ISO 9001"],
      crmLicensed: false,
    });
    const items = sections.flatMap((section) => flatten(section.items));
    const compliance = items.find((item) => item.id === "compliance");
    expect(compliance?.children?.map((child) => child.href)).toEqual([
      "/compliance/ISO%209001",
    ]);
    expect(items.some((item) => item.id === "crm")).toBe(false);
    expect(items.some((item) => item.id === "customers")).toBe(false);
  });

  it("hides Compliance entirely when no toolkit is licensed", () => {
    const sections = buildNavigationSections({
      licensedToolkits: [],
      crmLicensed: true,
    });
    const items = sections.flatMap((section) => flatten(section.items));
    expect(items.some((item) => item.id === "compliance")).toBe(false);
    expect(items.some((item) => item.id === "crm")).toBe(true);
  });
});
