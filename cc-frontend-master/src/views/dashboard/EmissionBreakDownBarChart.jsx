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
import { useDashboard } from "./store";
import { categoryFilters } from "../../components/CategoryFilters";
import brandConfig from "config.js";
import { GasInChemicalFormat } from "../../components/GasInChemicalFormat";
import CC_CONSTANTS from "../../constants";
export default function EmissionBreakDownBarChart({
  filter = categoryFilters.all.value,
}) {
  function isAllowedInFilter(scope) {
    return filter === categoryFilters.all.value || filter === scope;
  }
  let { report, reportBaseYear, selectedReportingYear } = useDashboard();
  const selectedYearKey =
    (selectedReportingYear?.year || "") + "- total CO2 emission";
  const baseYearKey = "Base year" + "- total CO2 emission";
  let data = Object.values(report?.scopeBasedEmissionResults).reduce(
    (finalList, currentScope) => {
      return [
        ...finalList,
        ...currentScope.categories?.map((cat) => ({
          name: cat.category,
          [selectedYearKey]: !isAllowedInFilter(currentScope._id)
            ? 0
            : cat.totalCO2eEmissions,
          [baseYearKey]: !isAllowedInFilter(currentScope._id)
            ? 0
            : reportBaseYear?.scopeBasedEmissionResults[
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
        <XAxis height={240} dataKey="name" interval={0} tick={<CustomTick />} />
        <YAxis />
        <Tooltip />
        <Legend
          y={
            <span>
              t<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E} />
            </span>
          }
        />
        <Bar dataKey={baseYearKey} fill={brandConfig.primaryColor} />
        <Bar dataKey={selectedYearKey} fill="#82ca9d" />
      </BarChart>
    </ResponsiveContainer>
  );
}
