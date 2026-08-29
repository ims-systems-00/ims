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
import { useHistoricTrendReport } from "./store";
import CC_CONSTANTS from "../../../constants";
import brandConfig from "config.js";
export default function ScopeEmissionChart({}) {
  let { report, reportBaseYear, selectedReportingYear } =
    useHistoricTrendReport();
  const selectedYearKey =
    (selectedReportingYear?.value || "") + "- total CO2 emission";

  let data = Object.keys(report?.scopeBasedEmissionResults).reduce(
    (data, scope) => {
      report?.scopeBasedEmissionResults[scope].forEach((item) => {
        if (!data[item.year]) data[item.year] = {};
        data[item.year] = {
          ...data[item.year],
          [item.scope]: item.totalCO2eEmissions,
          name: item.year,
        };
      });
      return data;
    },
    {}
  );
  data = Object.values(data);
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
        <Bar
          stackId="a"
          dataKey={CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_1}
          fill={brandConfig.primaryColor}
        />
        <Bar
          stackId="a"
          dataKey={CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_2}
          fill="#82ca9d"
        />
        <Bar
          stackId="a"
          dataKey={CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_3}
          fill="#d63384"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
