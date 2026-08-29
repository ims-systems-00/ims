import React from "react";
import ScopeEmissionChart from "../shared/ScopeEmissionChart";
import { useBaseYearCompareReport } from "./store";

export default function SYRScopeEmissionChart({}) {
  let { report } = useBaseYearCompareReport();
  let data = Object.values(report?.scopeBasedEmissionResults).reduce(
    (finalList, currentScope) => {
      return [
        ...finalList,
        {
          x: currentScope._id,
          y: currentScope.grandTotalCO2eEmissions,
        },
      ];
    },
    []
  );
  return <ScopeEmissionChart data={data} />;
}
