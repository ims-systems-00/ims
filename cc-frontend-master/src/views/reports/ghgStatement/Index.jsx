import React from "react";
import Navigationbar from "../shared/Navigationbar";
import Report from "./Report";
import { SingleYearReportProvider } from "./store";
function SingleYearReport() {
  return (
    <SingleYearReportProvider>
      <div className="bg-light">
        <Navigationbar></Navigationbar>
        <Report />
      </div>
    </SingleYearReportProvider>
  );
}

export default SingleYearReport;
