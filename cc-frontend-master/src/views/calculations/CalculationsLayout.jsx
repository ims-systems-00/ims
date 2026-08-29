import React from "react";
import { LuFootprints } from "react-icons/lu";
import { Outlet } from "react-router-dom";
import Navigationbar from "../../components/Navigationbar";
import { CalculationContextProvider } from "./stores/calculationStore";

const navigations = [
  {
    path: "/categories",
    text: "Emissions Categories",
    icon: <LuFootprints />,
  },
].map((item) => ({ ...item, path: "/calculations" + item.path }));

function CalculationsLayout() {
  return (
    <CalculationContextProvider>
      <Navigationbar navigaions={navigations} sticky={"top"} />
      <div className="content">
        <Outlet />
      </div>
    </CalculationContextProvider>
  );
}

export default CalculationsLayout;
