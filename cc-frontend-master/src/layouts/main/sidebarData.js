import { TbReportSearch } from "react-icons/tb";
import { LuFootprints } from "react-icons/lu";
import { GoPeople } from "react-icons/go";
import { IoOptionsOutline } from "react-icons/io5";
import { RxDashboard } from "react-icons/rx";
import { PiChartLineUp } from "react-icons/pi";

const sidebarData = [
  {
    id: "sidebar-menu-item-dashboard",
    path: "/dashboard",
    icon: <RxDashboard />,
    text: "Dashboard",
  },
  {
    id: "sidebar-menu-item-organsation",
    path: "/organisation",
    icon: <GoPeople />,
    text: "Our Organisation",
  },
  {
    id: "sidebar-menu-item-report-settings",
    path: "/parameters/reporting-overview",
    icon: <IoOptionsOutline />,
    text: "Report Settings",
  },
  {
    id: "sidebar-menu-item-categories",
    path: "/calculations/categories",
    icon: <LuFootprints />,
    text: "Add Data",
  },
  {
    id: "sidebar-menu-item-reports",
    path: "/reports",
    icon: <PiChartLineUp />,
    text: "Reports",
  },
  {
    id: "sidebar-menu-item-reduction-plan",
    path: "/reduction-plan",
    icon: <TbReportSearch />,
    text: "Reduction Plan",
  },
];

export { sidebarData };
