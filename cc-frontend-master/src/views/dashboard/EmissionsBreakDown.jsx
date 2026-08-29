import { Button, Table } from "@ims-systems-00/ims-ui-kit";
import React, { useState } from "react";
import CategoryFilters, {
  categoryFilters,
} from "../../components/CategoryFilters";
import useTraceNumericChanges from "../../hooks/useTraceNumericChanges";
import EmissionBreakDownBarChart from "./EmissionBreakDownBarChart";
import EmissionBreakDownPieChart from "./EmissionBreakDownPieChart";
import { RiDonutChartFill } from "react-icons/ri";
import { FiBarChart2 } from "react-icons/fi";
import { useDashboard } from "./store";
const chartTypes = {
  pie: {
    icon: <RiDonutChartFill />,
    value: "Pie",
  },
  bar: { icon: <FiBarChart2 />, value: "Bar" },
};
function ChartFilters({ onFilter = () => {} }) {
  const [currentFilter, setCurrentFilter] = React.useState(
    chartTypes.bar.value
  );
  return (
    <React.Fragment>
      {Object.values(chartTypes).map((chartType) => (
        <Button
          key={chartType.value}
          color={currentFilter === chartType.value ? "primary" : "secondary"}
          size={"sm"}
          className={"rounded-pill border-0 mt-2"}
          onClick={() => {
            setCurrentFilter(chartType.value);
            onFilter(chartType.value);
          }}
        >
          {chartType.icon} {chartType.value}
        </Button>
      ))}
    </React.Fragment>
  );
}

function EmissionsBreakDown() {
  const { isReportLoading, reportBaseYear, report } = useDashboard();
  const [chartTypeFilter, setChartTypeFilter] = useState(chartTypes.bar.value);
  const [scopeFilter, setScopeFilter] = useState(categoryFilters.all.value);
  const { traceNumericChanges, traceChangeColorClass } =
    useTraceNumericChanges();
  if (isReportLoading) return null;
  return (
    <React.Fragment>
      <div className="text-center my-3">
        <CategoryFilters onFilter={(f) => setScopeFilter(f)} />{" "}
        <ChartFilters onFilter={(f) => setChartTypeFilter(f)} />
      </div>
      {chartTypeFilter === chartTypes.bar.value && (
        <EmissionBreakDownBarChart filter={scopeFilter} />
      )}
      {chartTypeFilter === chartTypes.pie.value && (
        <EmissionBreakDownPieChart filter={scopeFilter} />
      )}
      {/* <hr />
      <div className="table-categories-container border border-1 mt-3">
        <Table className="m-0">
          <thead className="bg-secondary-extra-light">
            <tr>
              <th></th>
              <th>{reportBaseYear?.reportingYear}</th>
              <th>{report?.reportingYear}</th>
              <th></th>
            </tr>
            <tr>
              <th>Category</th>
              <th>tCO2e</th>
              <th>tCO2e</th>
              <th>% changes</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(report?.scopeBasedEmissionResults)
              .filter(
                (scope) =>
                  scopeFilter === categoryFilters.all.value ||
                  scopeFilter === scope
              )
              .map((scope) => {
                return (
                  <React.Fragment key={scope}>
                    {report?.scopeBasedEmissionResults[scope].categories.map(
                      (cat) => {
                        let baseTotalCO2eEmissions =
                          reportBaseYear.scopeBasedEmissionResults[
                            scope
                          ].categories.find(
                            (byrCat) => byrCat.category === cat.category
                          )?.totalCO2eEmissions;
                        let currentTotalCO2eEmissions = cat.totalCO2eEmissions;
                        let basePercentageCO2eOfTotal =
                          reportBaseYear.scopeBasedEmissionResults[
                            scope
                          ].categories.find(
                            (byrCat) => byrCat.category === cat.category
                          )?.percentageCO2eOfTotal;
                        let currentPercentageCO2eOfTotal =
                          cat.percentageCO2eOfTotal;
                        return (
                          <React.Fragment key={cat.category}>
                            <tr>
                              <td>{cat.category}</td>
                              <td>{baseTotalCO2eEmissions}</td>
                              <td>{currentTotalCO2eEmissions}</td>
                              <td
                                className={traceChangeColorClass(
                                  traceNumericChanges(
                                    baseTotalCO2eEmissions,
                                    currentTotalCO2eEmissions
                                  ).number
                                )}
                              >
                                {
                                  traceNumericChanges(
                                    baseTotalCO2eEmissions,
                                    currentTotalCO2eEmissions
                                  ).string
                                }
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      }
                    )}
                    <tr className="text-dark bg-secondary-light">
                      <td>Total</td>
                      <td>
                        {
                          reportBaseYear?.scopeBasedEmissionResults[scope]
                            .grandTotalCO2eEmissions
                        }
                      </td>
                      <td>
                        {
                          report?.scopeBasedEmissionResults[scope]
                            .grandTotalCO2eEmissions
                        }
                      </td>
                      <td
                        className={traceChangeColorClass(
                          traceNumericChanges(
                            reportBaseYear?.scopeBasedEmissionResults[scope]
                              .grandTotalCO2eEmissions,
                            report?.scopeBasedEmissionResults[scope]
                              .grandTotalCO2eEmissions
                          ).number
                        )}
                      >
                        {
                          traceNumericChanges(
                            reportBaseYear?.scopeBasedEmissionResults[scope]
                              .grandTotalCO2eEmissions,
                            report?.scopeBasedEmissionResults[scope]
                              .grandTotalCO2eEmissions
                          ).string
                        }
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            {scopeFilter === categoryFilters.all.value && (
              <tr className="text-dark bg-secondary-light">
                <td>Total (Scope 1, 2 & 3) results</td>
                <td>
                  {
                    reportBaseYear?.scopeBasedEmissionSummary
                      .grandTotalCO2eEmissions
                  }
                </td>
                <td>
                  {report?.scopeBasedEmissionSummary.grandTotalCO2eEmissions}
                </td>
                <td
                  className={traceChangeColorClass(
                    traceNumericChanges(
                      reportBaseYear?.scopeBasedEmissionSummary
                        .grandTotalCO2eEmissions,
                      report?.scopeBasedEmissionSummary.grandTotalCO2eEmissions
                    ).number
                  )}
                >
                  {
                    traceNumericChanges(
                      reportBaseYear?.scopeBasedEmissionSummary
                        .grandTotalCO2eEmissions,
                      report?.scopeBasedEmissionSummary.grandTotalCO2eEmissions
                    ).string
                  }
                </td>
              </tr>
            )}
            <tr className="text-dark">
              <td>Out of scope {report?.outOfScopeEmissionResults?._id}</td>
              <td>
                {
                  reportBaseYear?.outOfScopeEmissionResults
                    .totalGhgBiogenicCo2Emission
                }
              </td>

              <td>
                {report?.outOfScopeEmissionResults.totalGhgBiogenicCo2Emission}
              </td>
              <td
                className={traceChangeColorClass(
                  traceNumericChanges(
                    reportBaseYear?.outOfScopeEmissionResults
                      .totalGhgBiogenicCo2Emission,
                    report?.outOfScopeEmissionResults
                      .totalGhgBiogenicCo2Emission
                  ).number
                )}
              >
                {
                  traceNumericChanges(
                    reportBaseYear?.outOfScopeEmissionResults
                      .totalGhgBiogenicCo2Emission,
                    report?.outOfScopeEmissionResults
                      .totalGhgBiogenicCo2Emission
                  ).string
                }
              </td>
            </tr>
            <tr className="text-dark ">
              <td>tCO2e/1£m of turnover </td>

              <td>
                {reportBaseYear?.intensityRatio.totalCO2ePerMillionOfTurnOver}
              </td>

              <td>{report?.intensityRatio.totalCO2ePerMillionOfTurnOver}</td>

              <td
                className={traceChangeColorClass(
                  traceNumericChanges(
                    reportBaseYear?.intensityRatio
                      .totalCO2ePerMillionOfTurnOver,
                    report?.intensityRatio.totalCO2ePerMillionOfTurnOver
                  ).number
                )}
              >
                {
                  traceNumericChanges(
                    reportBaseYear?.intensityRatio
                      .totalCO2ePerMillionOfTurnOver,
                    report?.intensityRatio.totalCO2ePerMillionOfTurnOver
                  ).string
                }
              </td>
            </tr>
            <tr className="text-dark">
              <td>tCO2e/employee </td>

              <td>{reportBaseYear?.intensityRatio.totalCO2ePerEmployee}</td>

              <td>{report?.intensityRatio.totalCO2ePerEmployee}</td>

              <td
                className={traceChangeColorClass(
                  traceNumericChanges(
                    reportBaseYear?.intensityRatio.totalCO2ePerEmployee,
                    report?.intensityRatio.totalCO2ePerEmployee
                  ).number
                )}
              >
                {
                  traceNumericChanges(
                    reportBaseYear?.intensityRatio.totalCO2ePerEmployee,
                    report?.intensityRatio.totalCO2ePerEmployee
                  ).string
                }
              </td>
            </tr>
          </tbody>
        </Table>
      </div> */}
    </React.Fragment>
  );
}

export default EmissionsBreakDown;
