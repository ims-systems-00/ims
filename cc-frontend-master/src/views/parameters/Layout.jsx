import React from "react";
import { BiCog } from "react-icons/bi";
import { GrLocation } from "react-icons/gr";
import { LuBookOpenCheck, LuCalendarClock } from "react-icons/lu";
import { Outlet } from "react-router-dom";
import Navigationbar from "../../components/Navigationbar";
import { ParameterManagerContextProvider } from "./store";
const navigations = [
  {
    id: "guidelines-configaration",
    path: "/guidelines",
    text: "Guidelines",
    icon: <LuBookOpenCheck />,
  },
  {
    id: "reporting-overview-configaration",
    path: "/reporting-overview",
    text: "Overview",
    icon: <BiCog />,
  },
  {
    id: "reporting-periods-configaration",
    path: "/reporting-periods",
    text: "Reporting Periods",
    icon: <LuCalendarClock />,
  },
  {
    id: "locations-configaration",
    path: "/locations",
    text: "Locations",
    icon: <GrLocation />,
  },
].map((item) => ({ ...item, path: "/parameters" + item.path }));

function Layout() {
  return (
    <ParameterManagerContextProvider>
      <Navigationbar navigaions={navigations} sticky={"top"} />
      <div className="content">
        <Outlet />
      </div>
    </ParameterManagerContextProvider>
  );
}

export default Layout;
