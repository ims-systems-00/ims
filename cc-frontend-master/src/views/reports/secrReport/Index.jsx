import React from "react";
import Report from "./Report";

import { SecrReportContextProvider } from "./store";
function SecrReport() {
  return (
    <SecrReportContextProvider>
      <Report />
    </SecrReportContextProvider>
  );
}

export default SecrReport;
