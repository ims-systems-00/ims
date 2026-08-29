import React, { PureComponent } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useBaseYearCompareReport } from "./store";
import brandConfig from "config.js";
export default function ScopeEmissionChart({}) {
  let { report, reportBaseYear, selectedReportingYear } =
    useBaseYearCompareReport();
  const selectedYearKey =
    (selectedReportingYear?.value || "") + "- total CO2 emission";
  const baseYearKey = "Base year" + "- total CO2 emission";
  let data = Object.values(report?.scopeBasedEmissionResults).reduce(
    (finalList, currentScope) => {
      return [
        ...finalList,
        {
          name: currentScope._id,
          [selectedYearKey]: currentScope.grandTotalCO2eEmissions,
          [baseYearKey]:
            reportBaseYear?.scopeBasedEmissionResults[currentScope?._id]
              ?.grandTotalCO2eEmissions,
        },
      ];
    },
    []
  );
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" interval={0} />
        <YAxis />
        <Tooltip />
        <Legend y={"tCO2e"} />
        <Bar stackId="a" dataKey={baseYearKey} fill={brandConfig.primaryColor} />
        <Bar stackId="a" dataKey={selectedYearKey} fill="#82ca9d" />
      </BarChart>
    </ResponsiveContainer>
  );
}
