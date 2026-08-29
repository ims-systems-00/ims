import React from "react";
import Navigationbar from "../shared/Navigationbar";
import Report from "./Report";
import { BaseYearCompareReportProvider } from "./store";
function BaseYearCompareReport() {
  return (
    <BaseYearCompareReportProvider>
      <div className="bg-light">
        <Navigationbar></Navigationbar>
        <Report />
      </div>
    </BaseYearCompareReportProvider>
  );
}

export default BaseYearCompareReport;
