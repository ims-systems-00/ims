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
import brandConfig from "config.js";

export default function CategoryEmissionChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={600}>
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
        <XAxis height={220} dataKey="name" interval={0} tick={<CustomTick />} />
        <YAxis />
        <Tooltip />
        <Legend y={"tCO2e"} />
        <Bar dataKey="Total CO2 emission" fill={brandConfig.primaryColor} />
      </BarChart>
    </ResponsiveContainer>
  );
}
