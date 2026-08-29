import React from "react";
import ActivityEmissionChart from "../shared/ActivityEmissionChart";
import { useSingleYearReport } from "./store";

export default function SYRActivityEmissionChart({}) {
  let { report } = useSingleYearReport();
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
