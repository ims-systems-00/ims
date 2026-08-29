import React from "react";
import ReportingOverview from "./ReportingOverview";
import NoParamsGuard from "../NoParamsGuard";
import { ReportingOverviewContextProvider } from "./store";
export default function () {
  return (
    <NoParamsGuard>
      <ReportingOverviewContextProvider>
        <ReportingOverview />
      </ReportingOverviewContextProvider>
    </NoParamsGuard>
  );
}
