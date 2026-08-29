import React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboard } from "./store";

export default function IntensityRatioChart({}) {
  let { report, reportBaseYear, selectedReportingYear } = useDashboard();
  const totalCO2ePerMillionOfTurnOverKey = "Total CO2e/£1m of turnover";
  const totalCO2ePerEmployeeKey = "Total CO2e/Employee";
  let data = [
    {
      name: reportBaseYear?.reportingYear,
      [totalCO2ePerMillionOfTurnOverKey]:
        reportBaseYear?.intensityRatio?.totalCO2ePerMillionOfTurnOver,
      [totalCO2ePerEmployeeKey]:
        reportBaseYear?.intensityRatio?.totalCO2ePerEmployee,
    },
    {
      name: report?.reportingYear,
      [totalCO2ePerMillionOfTurnOverKey]:
        report?.intensityRatio?.totalCO2ePerMillionOfTurnOver,
      [totalCO2ePerEmployeeKey]: report?.intensityRatio?.totalCO2ePerEmployee,
    },
  ];
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        layout="horizontal"
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
        <Line dataKey={totalCO2ePerMillionOfTurnOverKey} stroke="#17a2b8" />
        <Line dataKey={totalCO2ePerEmployeeKey} stroke="#82ca9d" />
      </LineChart>
    </ResponsiveContainer>
  );
}
