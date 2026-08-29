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

export default function ScopeEmissionChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data.map((d) => ({
          name: d.x,
          "Total CO2 emission": d.y,
        }))}
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
        <Bar dataKey="Total CO2 emission" fill="#d63384" />
      </BarChart>
    </ResponsiveContainer>
  );
}
