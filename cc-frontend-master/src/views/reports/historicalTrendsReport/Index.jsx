import React from "react";
import Navigationbar from "../shared/Navigationbar";
import Report from "./Report";
import { HistoricTrendReportProvider } from "./store";
function BaseYearCompareReport() {
  return (
    <HistoricTrendReportProvider>
      <div className="bg-light">
        <Navigationbar></Navigationbar>
        <Report />
      </div>
    </HistoricTrendReportProvider>
  );
}

export default BaseYearCompareReport;
