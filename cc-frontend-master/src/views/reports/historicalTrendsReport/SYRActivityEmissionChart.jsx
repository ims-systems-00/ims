import React from "react";
import ActivityEmissionChart from "../shared/ActivityEmissionChart";
import { useBaseYearCompareReport } from "./store";

export default function SYRActivityEmissionChart({}) {
  let { report } = useBaseYearCompareReport();
  let data = Object.values(report?.activityBasedEmissionResults).reduce(
    (finalList, current) => {
      return [
        ...finalList,
        {
          x: current._id,
          y: current.totalCO2eEmissions,
        },
      ];
    },
    []
  );
  return <ActivityEmissionChart data={data} />;
}
