import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import CustomTick from "./CustomTick";
import { useBaseYearCompareReport } from "./store";
import brandConfig from "config.js";
export default function CategoryEmissionChart({}) {
  let { report, reportBaseYear, selectedReportingYear } =
    useBaseYearCompareReport();
  const selectedYearKey =
    (selectedReportingYear?.value || "") + "- total CO2 emission";
  const baseYearKey = "Base year" + "- total CO2 emission";
  let data = Object.values(report?.scopeBasedEmissionResults).reduce(
    (finalList, currentScope) => {
      return [
        ...finalList,
        ...currentScope.categories?.map((cat) => ({
          name: cat.category,
          [selectedYearKey]: cat.totalCO2eEmissions,
          [baseYearKey]: reportBaseYear?.scopeBasedEmissionResults[
            currentScope?._id
          ].categories?.find((_cat) => _cat.category === cat.category)
            ?.totalCO2eEmissions,
        })),
      ];
    },
    []
  );
  return (
    <ResponsiveContainer width="100%" height={600}>
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
        <XAxis height={220} dataKey="name" interval={0} tick={<CustomTick />} />
        <YAxis yAxisId="left" orientation="left" stroke={brandConfig.primaryColor} />
        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
        <Tooltip />
        <Legend y={"tCO2e"} />
        <Bar yAxisId="left" dataKey={baseYearKey} fill={brandConfig.primaryColor} />
        <Bar yAxisId="right" dataKey={selectedYearKey} fill="#82ca9d" />
      </BarChart>
    </ResponsiveContainer>
  );
}
