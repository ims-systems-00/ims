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
import { useHistoricTrendReport } from "./store";

export default function IntensityRatioChart({}) {
  let { report } = useHistoricTrendReport();
  const totalCO2ePerMillionOfTurnOverKey = "Total CO2e/£1m of turnover";
  const totalCO2ePerEmployeeKey = "Total CO2e/Employee";
  let data = Object.values(report?.intesityRatioResults).reduce(
    (finalList, current) => {
      return [
        ...finalList,
        {
          name: current._id,
          [totalCO2ePerMillionOfTurnOverKey]:
            current.totalCO2ePerMillionOfTurnOver || 0,
          [totalCO2ePerEmployeeKey]: current.totalCO2ePerEmployee || 0,
        },
      ];
    },
    []
  );
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
