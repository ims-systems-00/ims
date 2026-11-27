import {
  Activity,
  Flag,
  AlertTriangle,
  BriefcaseBusiness,
  Bug,
  Building2,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  Contact,
  Mail,
  FileText,
  FolderOpen,
  Handshake,
  Import,
  Landmark,
  LayoutDashboard,
  Lightbulb,
  ListTodo,
  Network,
  GraduationCap,
  Package,
  FileQuestion,
  PenLine,
  ClipboardList,
  ShieldAlert,
  Scale,
  ShieldCheck,
  Tags,
  Target,
  Truck,
  Users,
} from "lucide-react";
import {
  COMPLIANCE_TOOLKIT_NAMES,
  toolkitDisplayLabel,
  toolkitPath,
} from "@/modules/compliance/types";
import { LIVE_STANDARDS } from "@/modules/live-compliance/types";
import type { NavSection } from "./types";

export type NavigationLicenceFilter = {
  /** Licensed compliance toolkit names; null = show full catalogue (dev-stub). */
  licensedToolkits: readonly string[] | null;
  /** Whether CRM is licensed; null = show (dev-stub). */
  crmLicensed: boolean | null;
};

export const ALL_LICENCES_FILTER: NavigationLicenceFilter = {
  licensedToolkits: null,
  crmLicensed: null,
};

function complianceChildren(
  licensedToolkits: readonly string[] | null
) {
  const names =
    licensedToolkits === null
      ? COMPLIANCE_TOOLKIT_NAMES
      : COMPLIANCE_TOOLKIT_NAMES.filter((name) =>
          licensedToolkits.includes(name)
        );
  const toolkits = names.map((name) => ({
    id: `compliance-${name}`,
    label: toolkitDisplayLabel(name),
    href: toolkitPath(name),
    icon: ShieldCheck,
    requiredPermission: "compliance:read",
  }));
  // Live ISO compliance monitors ISO 9001 / 14001 / 45001 only.
  const hasLiveStandard = names.some((name) =>
    (LIVE_STANDARDS as readonly string[]).includes(name)
  );
  return hasLiveStandard
    ? [
        {
          id: "compliance-live",
          label: "Live compliance",
          href: "/compliance/live",
          icon: Activity,
          requiredPermission: "compliance:read",
        },
        {
          id: "compliance-legal-register",
          label: "Legal register",
          href: "/compliance/legal-register",
          icon: Scale,
          requiredPermission: "compliance:read",
        },
        {
          id: "compliance-journey",
          label: "Get ready for ISO",
          href: "/compliance/journey",
          icon: Flag,
          requiredPermission: "compliance:read",
        },
        ...toolkits,
      ]
    : toolkits;
}

/**
 * Application navigation — only real routes plus structure for growth.
 * Do not invent business modules here; add entries when modules ship.
 * Licence-gated sections (Compliance toolkits, CRM) follow V4: only
 * licensed toolkits/modules are shown.
 */
export function buildNavigationSections(
  licences: NavigationLicenceFilter = ALL_LICENCES_FILTER
): NavSection[] {
  return [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      {
        id: "dashboard",
        label: "Live Dashboard",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        id: "partnership",
        label: "Partnership",
        href: "/partner/dashboard",
        icon: Handshake,
      },
      {
        id: "organisation",
        label: "Organisation",
        icon: Building2,
        children: [
          {
            id: "my-organisation",
            label: "My organisation",
            href: "/organisation",
            icon: Building2,
          },
          {
            id: "functional-units",
            label: "Functional Units",
            href: "/functional-units",
            icon: Network,
            requiredPermission: "functional-units:read",
          },
          {
            id: "users",
            label: "Users",
            href: "/users",
            icon: Users,
            requiredPermission: "users:read",
          },
          {
            id: "business-premises",
            label: "Business Premises",
            href: "/business-premises",
            icon: Landmark,
            requiredPermission: "business-premises:read",
          },
        ],
      },
      {
        id: "documents",
        label: "Documents",
        icon: FolderOpen,
        children: [
          {
            id: "documents-overview",
            label: "Overview",
            href: "/documents",
            icon: FolderOpen,
            requiredPermission: "document-management:read",
          },
          {
            id: "documents-signatures",
            label: "Signature requests",
            href: "/documents/signatures",
            icon: PenLine,
            requiredPermission: "document-management:read",
          },
          {
            id: "documents-forms",
            label: "Forms",
            href: "/documents/forms",
            icon: ClipboardList,
            // Same as other Documents children so the item is visible whenever
            // the user can open Documents. IMS Forms is free (no licence gate).
            requiredPermission: "document-management:read",
          },
        ],
      },
      {
        id: "inventory",
        label: "Inventory",
        href: "/inventory",
        icon: Package,
        requiredPermission: "inventory:read",
      },
      {
        id: "training",
        label: "Training",
        href: "/training",
        icon: GraduationCap,
        requiredPermission: "training:read",
      },
      {
        id: "tender",
        label: "Tender",
        href: "/tender",
        icon: FileQuestion,
        requiredPermission: "tender:read",
      },
      {
        id: "risks",
        label: "Risks",
        href: "/risks",
        icon: ShieldAlert,
        requiredPermission: "risks:read",
      },
      {
        id: "incidents",
        label: "Incidents",
        href: "/incidents",
        icon: AlertTriangle,
        requiredPermission: "incidents:read",
      },
      {
        id: "audits",
        label: "Audits",
        icon: ClipboardCheck,
        children: [
          {
            id: "audits-internal",
            label: "Internal",
            href: "/audits/internal",
            icon: ClipboardCheck,
            requiredPermission: "audits:read",
          },
          {
            id: "audits-external",
            label: "External",
            href: "/audits/external",
            icon: ClipboardCheck,
            requiredPermission: "audits:read",
          },
        ],
      },
      {
        id: "reviews",
        label: "Reviews",
        icon: CalendarCheck,
        children: [
          {
            id: "management-reviews",
            label: "Schedule",
            href: "/management-reviews",
            icon: CalendarCheck,
            requiredPermission: "management-reviews:read",
          },
          {
            id: "kpi-objectives",
            label: "KPI/Objectives",
            href: "/kpi-objectives",
            icon: Target,
            requiredPermission: "kpi-objectives:read",
          },
          {
            id: "tags-and-categories",
            label: "Tags",
            href: "/tags-and-categories",
            icon: Tags,
            requiredPermission: "tags-and-categories:read",
          },
        ],
      },
      {
        id: "ofi",
        label: "OFI",
        href: "/ofi",
        icon: Lightbulb,
        requiredPermission: "ofi:read",
      },
      ...(complianceChildren(licences.licensedToolkits).length > 0
        ? [
            {
              id: "compliance",
              label: "Compliance",
              icon: ShieldCheck,
              children: complianceChildren(licences.licensedToolkits),
            },
          ]
        : []),
      ...(licences.crmLicensed === false
        ? []
        : [
            {
              id: "crm",
              label: "CRM",
              icon: BriefcaseBusiness,
              children: [
                {
                  id: "customers-overview",
                  label: "MY CRM",
                  href: "/customers/overview",
                  icon: BriefcaseBusiness,
                  requiredPermission: "customers:read",
                },
                {
                  id: "customers",
                  label: "Customers",
                  href: "/customers",
                  icon: Contact,
                  requiredPermission: "customers:read",
                },
                {
                  id: "email-campaigns",
                  label: "Email Campaign",
                  href: "/email-campaigns",
                  icon: Mail,
                  requiredPermission: "customers:read",
                },
                {
                  id: "invoices",
                  label: "Invoices",
                  href: "/invoices",
                  icon: FileText,
                  requiredPermission: "customers:read",
                },
              ],
            },
          ]),
      {
        id: "suppliers",
        label: "Suppliers",
        href: "/suppliers",
        icon: Truck,
        requiredPermission: "suppliers:read",
      },
      {
        id: "tasks",
        label: "Tasks",
        href: "/tasks",
        icon: ListTodo,
        requiredPermission: "tasks:read",
      },
      {
        id: "calendar",
        label: "Calendar",
        href: "/calendar",
        icon: Calendar,
        requiredPermission: "calendar:read",
      },
      {
        id: "data-import",
        label: "Data Import",
        href: "/data-import",
        icon: Import,
        requiredPermission: "users:read",
      },
      {
        id: "report-bug",
        label: "Report Bug",
        href: "/report-bug",
        icon: Bug,
      },
    ],
  },
  ];
}

/** Full-catalogue navigation (breadcrumbs / dev-stub). */
export const navigationSections: NavSection[] = buildNavigationSections();
