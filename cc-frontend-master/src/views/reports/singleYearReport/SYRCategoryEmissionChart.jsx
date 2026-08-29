import React from "react";
import CategoryEmissionChart from "../shared/CategoryEmissionChart";
import { useSingleYearReport } from "./store";

export default function SYRCategoryEmissionChart({}) {
  let { report } = useSingleYearReport();
  let data = Object.values(report?.scopeBasedEmissionResults).reduce(
    (finalList, currentScope) => {
      return [
        ...finalList,
        ...currentScope.categories?.map((cat) => ({
          x: cat.category,
          y: cat.totalCO2eEmissions,
        })),
      ];
    },
    []
  );
  return <CategoryEmissionChart data={data} />;
}
