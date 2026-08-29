import React from "react";
import Contents from "./Contents";
import { ISO14064FullReportProvider } from "./store";

function Iso14064FullReport() {
  return (
    <ISO14064FullReportProvider>
      <Contents />
    </ISO14064FullReportProvider>
  );
}

export default Iso14064FullReport;
