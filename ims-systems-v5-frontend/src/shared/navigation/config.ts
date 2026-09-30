import {
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  Contact,
  Cpu,
  FileText,
  HardDrive,
  Landmark,
  LayoutDashboard,
  Lightbulb,
  ListTodo,
  MapPin,
  Network,
  Package,
  ShieldAlert,
  Truck,
  Users,
} from "lucide-react";
import type { NavSection } from "./types";

/**
 * Application navigation — only real routes plus structure for growth.
 * Do not invent business modules here; add entries when modules ship.
 */
export const navigationSections: NavSection[] = [
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
        id: "organisation",
        label: "Organisation",
        icon: Building2,
        children: [
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
        id: "inventory",
        label: "Inventory",
        icon: Package,
        children: [
          {
            id: "assets-hardware",
            label: "Hardware",
            href: "/assets/hardware",
            icon: HardDrive,
            requiredPermission: "inventory:read",
          },
          {
            id: "assets-software",
            label: "Software",
            href: "/assets/software",
            icon: Cpu,
            requiredPermission: "inventory:read",
          },
          {
            id: "assets-people",
            label: "People",
            href: "/assets/people",
            icon: Users,
            requiredPermission: "inventory:read",
          },
          {
            id: "assets-premise",
            label: "Premises",
            href: "/assets/premise",
            icon: MapPin,
            requiredPermission: "inventory:read",
          },
          {
            id: "assets-information",
            label: "Information",
            href: "/assets/information",
            icon: FileText,
            requiredPermission: "inventory:read",
          },
        ],
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
        ],
      },
      {
        id: "ofi",
        label: "OFI",
        href: "/ofi",
        icon: Lightbulb,
        requiredPermission: "ofi:read",
      },
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
        ],
      },
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
    ],
  },
];
