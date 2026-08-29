import React, { useEffect, useState } from "react";
import { Pie, Cell, PieChart, ResponsiveContainer, Sector } from "recharts";
import { categoryFilters } from "../../components/CategoryFilters";
import { useDashboard } from "./store";
import CC_CONSTANTS from "../../constants";
import brandConfig from "config.js";
import { Col, Row } from "@ims-systems-00/ims-ui-kit";
import { GoDotFill } from "react-icons/go";
const renderActiveShape = (props) => {
  const RADIAN = Math.PI / 180;
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";
  return (
    <g>
      <text
        x={cx}
        y={cy}
        dy={8}
        style={{ whiteSpace: "pre-wrap" }}
        fontSize={13}
        textAnchor="middle"
        fill={fill}
      >
        {payload.name}
        {/* <br></br>
        {"Reporting year: " + payload.year} */}
      </text>

      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        fill="none"
      />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        textAnchor={textAnchor}
        fill="#333"
      >{`tonne CO2-eq: ${parseInt(value).toLocaleString()}`}</text>
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        dy={18}
        textAnchor={textAnchor}
        fill="#999"
      >
        {`${(percent * 100).toFixed(2)}% of total`}
      </text>
    </g>
  );
};

export default function EmissionBreakDownPieChart({
  filter = categoryFilters.all.value,
}) {
  let [activeIndex, setActiveIndex] = useState(0);
  function isAllowedInFilter(scope) {
    return filter === categoryFilters.all.value || filter === scope;
  }
  let { report } = useDashboard();
  let data = Object.values(report?.scopeBasedEmissionResults).reduce(
    (finalList, currentScope) => {
      return [
        ...finalList,
        ...currentScope.categories?.map((cat) => ({
          name: cat.category,
          year: report.reportingYear,
          color: CC_CONSTANTS.CC_EMISSION_COLORS[cat.category] || "#1d8a23",
          value: !isAllowedInFilter(currentScope._id)
            ? 0
            : cat.totalCO2eEmissions,
        })),
      ];
    },
    []
  );
  function onPieEnter(_, index) {
    setActiveIndex(index);
  }
  if (!parseInt(report?.scopeBasedEmissionSummary.grandTotalCO2eEmissions))
    return <p className="text-center">There is not data in the chart.</p>;
  return (
    <Row>
      <Col md="8">
        <ResponsiveContainer width="100%" height={600}>
          <PieChart width={600} height={600}>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={140}
              outerRadius={180}
              fill={brandConfig.primaryColor}
              dataKey="value"
              onMouseEnter={onPieEnter}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </Col>
      <Col md="4" className="d-flex flex-column justify-content-center">
        {data.map((entry, index) => (
          <p key={`cell-${index + entry.name}`} className="mb-1">
            <GoDotFill color={entry.color} /> {entry.name}
          </p>
        ))}
      </Col>
    </Row>
  );
}
