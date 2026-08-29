import React from "react";
import { IoMdCheckmarkCircleOutline } from "react-icons/io";
import { PiCaretUpDownBold } from "react-icons/pi";
import { TbClockShare } from "react-icons/tb";
import Navigationbar from "../../components/Navigationbar";
import { Outlet } from "react-router-dom";
import { InitiativeConfigContextProvider } from "./store";
import {
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from "@ims-systems-00/ims-ui-kit";
import { useParameters } from "../../store/parametersStore";
import classNames from "classnames";
import TourStep from "../../components/TourStep";

const navigations = [
  {
    id: "completed-initiatives-tab",
    path: "/complete",
    text: "Completed initiatives",
    icon: <IoMdCheckmarkCircleOutline />,
  },
  {
    id: "planned-initiatives-tab",
    path: "/planned",
    text: "Planned initiatives",
    icon: <TbClockShare />,
  },
].map((item) => ({ ...item, path: "/initiatives" + item.path }));

function YearsNavigation() {
  const { reportingPeriods, selectedReportingYear, selectReportingYear } =
    useParameters();
  return (
    <UncontrolledDropdown>
      <DropdownToggle className="border-0 text-dark">
        <React.Fragment>
          Showing the initiatives during: {selectedReportingYear?.year} (
          {selectedReportingYear?.startDate} - {selectedReportingYear?.endDate}){" "}
          <PiCaretUpDownBold />
        </React.Fragment>
      </DropdownToggle>
      <DropdownMenu className={"mb-3"}>
        {reportingPeriods?.map((p) => {
          return (
            <DropdownItem
              className={classNames("", {
                "text-primary": p.year === selectedReportingYear?.year,
              })}
              key={p.year}
              onClick={() => {
                selectReportingYear(p);
              }}
            >
              {p.year} ({p?.startDate} - {p?.endDate})
            </DropdownItem>
          );
        })}
      </DropdownMenu>
    </UncontrolledDropdown>
  );
}
function Layout() {
  return (
    <InitiativeConfigContextProvider>
      <Navigationbar activeTabIdex={0} navigaions={navigations} sticky={"top"}>
        <TourStep stepId={"year-select-drop-down"}>
          <YearsNavigation />
        </TourStep>
      </Navigationbar>
      <div className="content">
        <Outlet />
      </div>
    </InitiativeConfigContextProvider>
  );
}

export default Layout;
