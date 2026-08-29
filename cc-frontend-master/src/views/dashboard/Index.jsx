import React from "react";
import { DashboardProvider } from "./store";
import Dashboard from "./Dashboard";

function Index() {
  return (
    <DashboardProvider>
      <Dashboard />
    </DashboardProvider>
  );
}

export default Index;
