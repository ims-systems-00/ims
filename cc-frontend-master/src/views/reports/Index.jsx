import React from "react";
import { ReportsContextProvider } from "./store";
import ReportsContainer from "./ReportsContainer";
function Reports() {
  return (
    <ReportsContextProvider>
      <ReportsContainer />
    </ReportsContextProvider>
  );
}

export default Reports;
