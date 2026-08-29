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
import { useHistoricTrendReport } from "./store";
import brandConfig from "config.js";
export default function CategoryEmissionChart({}) {
  let { report } = useHistoricTrendReport();

  let data = Object.values(report?.scopeCategoryBasedEmissionResults).reduce(
    (finalList, currentScope) => {
      return [
        ...finalList,
        ...currentScope?.reduce(
          (finalList, cat) => [
            ...finalList,
            {
              name: cat._id.category,
              ...cat.calculations.reduce(
                (final, calc) => ({
                  ...final,
                  [calc.year]: calc.totalCO2eEmissions,
                }),
                {}
              ),
            },
          ],
          []
        ),
      ];
    },
    []
  );
  let years = { ...data[0] };
  delete years["name"];
  years = Object.keys(years);
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
        <YAxis orientation="left" stroke={brandConfig.primaryColor} />
        <Tooltip />
        <Legend y={"tCO2e"} />
        {years.map((year) => (
          <Bar key={year} dataKey={year} fill={brandConfig.primaryColor} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
