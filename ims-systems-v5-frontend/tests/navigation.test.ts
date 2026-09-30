import { describe, expect, it } from "vitest";
import {
  breadcrumbsForPath,
  isNavBranchActive,
  isNavItemActive,
  navigationSections,
  pageTitleForPath,
} from "@/shared/navigation";

describe("navigation utils", () => {
  it("matches exact dashboard path", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/functional-units", "/")).toBe(false);
  });

  it("matches nested functional unit routes", () => {
    expect(isNavItemActive("/functional-units", "/functional-units")).toBe(
      true
    );
    expect(
      isNavItemActive("/functional-units/abc", "/functional-units")
    ).toBe(true);
  });

  it("marks organisation branch active for nested module paths", () => {
    const organisation = navigationSections[0]!.items.find(
      (item) => item.id === "organisation"
    )!;
    expect(isNavBranchActive("/functional-units", organisation)).toBe(true);
    expect(isNavBranchActive("/", organisation)).toBe(false);
  });

  it("builds breadcrumbs for functional units", () => {
    expect(breadcrumbsForPath("/functional-units", navigationSections)).toEqual(
      [
        { label: "Dashboard", href: "/" },
        { label: "Organisation" },
        { label: "Functional Units", href: "/functional-units" },
      ]
    );
  });

  it("includes Users under Organisation navigation", () => {
    const organisation = navigationSections[0]!.items.find(
      (item) => item.id === "organisation"
    )!;
    const users = organisation.children?.find((item) => item.id === "users");
    expect(users?.href).toBe("/users");
    expect(isNavBranchActive("/users", organisation)).toBe(true);
    expect(breadcrumbsForPath("/users", navigationSections)).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Organisation" },
      { label: "Users", href: "/users" },
    ]);
  });

  it("includes Business Premises under Organisation navigation", () => {
    const organisation = navigationSections[0]!.items.find(
      (item) => item.id === "organisation"
    )!;
    const premises = organisation.children?.find(
      (item) => item.id === "business-premises"
    );
    expect(premises?.href).toBe("/business-premises");
    expect(isNavBranchActive("/business-premises", organisation)).toBe(true);
    expect(
      breadcrumbsForPath("/business-premises", navigationSections)
    ).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Organisation" },
      { label: "Business Premises", href: "/business-premises" },
    ]);
  });

  it("includes Risks as a top-level navigation item", () => {
    const risks = navigationSections[0]!.items.find(
      (item) => item.id === "risks"
    )!;
    expect(risks.href).toBe("/risks");
    expect(isNavItemActive("/risks", risks.href)).toBe(true);
    expect(breadcrumbsForPath("/risks", navigationSections)).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Risks", href: "/risks" },
    ]);
    const organisation = navigationSections[0]!.items.find(
      (item) => item.id === "organisation"
    )!;
    expect(isNavBranchActive("/risks", organisation)).toBe(false);
  });

  it("includes Tasks as a top-level navigation item", () => {
    const tasks = navigationSections[0]!.items.find(
      (item) => item.id === "tasks"
    )!;
    expect(tasks.href).toBe("/tasks");
    expect(isNavItemActive("/tasks", tasks.href)).toBe(true);
    expect(breadcrumbsForPath("/tasks", navigationSections)).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Tasks", href: "/tasks" },
    ]);
  });

  it("includes Calendar as a top-level navigation item", () => {
    const calendar = navigationSections[0]!.items.find(
      (item) => item.id === "calendar"
    )!;
    expect(calendar.href).toBe("/calendar");
    expect(isNavItemActive("/calendar", calendar.href)).toBe(true);
    expect(breadcrumbsForPath("/calendar", navigationSections)).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Calendar", href: "/calendar" },
    ]);
  });

  it("includes Incidents as a top-level navigation item", () => {
    const incidents = navigationSections[0]!.items.find(
      (item) => item.id === "incidents"
    )!;
    expect(incidents.href).toBe("/incidents");
    expect(isNavItemActive("/incidents", incidents.href)).toBe(true);
    expect(breadcrumbsForPath("/incidents", navigationSections)).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Incidents", href: "/incidents" },
    ]);
  });

  it("includes OFI as a top-level navigation item", () => {
    const ofi = navigationSections[0]!.items.find((item) => item.id === "ofi")!;
    expect(ofi.href).toBe("/ofi");
    expect(isNavItemActive("/ofi", ofi.href)).toBe(true);
    expect(breadcrumbsForPath("/ofi", navigationSections)).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "OFI", href: "/ofi" },
    ]);
  });

  it("includes Suppliers as a top-level navigation item", () => {
    const suppliers = navigationSections[0]!.items.find(
      (item) => item.id === "suppliers"
    )!;
    expect(suppliers.href).toBe("/suppliers");
    expect(isNavItemActive("/suppliers", suppliers.href)).toBe(true);
    expect(breadcrumbsForPath("/suppliers", navigationSections)).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Suppliers", href: "/suppliers" },
    ]);
  });

  it("includes CRM with Customers and MY CRM children", () => {
    const crm = navigationSections[0]!.items.find((item) => item.id === "crm")!;
    expect(isNavBranchActive("/customers", crm)).toBe(true);
    expect(isNavBranchActive("/customers/overview", crm)).toBe(true);
    expect(breadcrumbsForPath("/customers", navigationSections)).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "CRM" },
      { label: "Customers", href: "/customers" },
    ]);
    expect(
      breadcrumbsForPath("/customers/overview", navigationSections)
    ).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "CRM" },
      { label: "MY CRM", href: "/customers/overview" },
    ]);
  });

  it("includes Audits with Internal and External children", () => {
    const audits = navigationSections[0]!.items.find(
      (item) => item.id === "audits"
    )!;
    expect(isNavBranchActive("/audits/internal", audits)).toBe(true);
    expect(breadcrumbsForPath("/audits/external", navigationSections)).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Audits" },
      { label: "External", href: "/audits/external" },
    ]);
  });

  it("builds breadcrumbs for inventory hardware", () => {
    expect(
      breadcrumbsForPath("/assets/hardware", navigationSections)
    ).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Inventory" },
      { label: "Hardware", href: "/assets/hardware" },
    ]);
  });

  it("marks inventory branch active for asset paths", () => {
    const inventory = navigationSections[0]!.items.find(
      (item) => item.id === "inventory"
    )!;
    expect(isNavBranchActive("/assets/software", inventory)).toBe(true);
    expect(isNavBranchActive("/functional-units", inventory)).toBe(false);
  });

  it("resolves page title from the leaf crumb", () => {
    expect(pageTitleForPath("/functional-units", navigationSections)).toBe(
      "Functional Units"
    );
    expect(pageTitleForPath("/assets/premise", navigationSections)).toBe(
      "Premises"
    );
    expect(pageTitleForPath("/", navigationSections)).toBe("Dashboard");
  });

  it("includes Live Dashboard as the workspace index route", () => {
    const dashboard = navigationSections[0]!.items.find(
      (item) => item.id === "dashboard"
    )!;
    expect(dashboard.href).toBe("/");
    expect(dashboard.label).toBe("Live Dashboard");
  });
});
