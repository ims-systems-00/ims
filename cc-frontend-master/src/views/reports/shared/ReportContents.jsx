import React from "react";
function ReportContents({ className = "", children }) {
  return <div className={className + " content"}>{children}</div>;
}

export default ReportContents;
