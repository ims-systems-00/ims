import { Table } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { useISO14064FullReport } from "./store";
import useTraceNumericChanges from "../../../hooks/useTraceNumericChanges";
import CC_CONSTANTS from "../../../constants";
import { GasInChemicalFormat } from "../../../components/GasInChemicalFormat";

function EmissionsCategoriesTable() {
  const { report, reportBaseYear } = useISO14064FullReport();
  const { traceChangeColorClass, traceNumericChanges } =
    useTraceNumericChanges();
  return (
    <Table className>
      <thead className="bg-secondary-extra-light">
        <tr>
          <th colSpan={3}></th>
          <th colSpan={2}>{reportBaseYear?.reportingYear}</th>
          <th colSpan={2}>{report?.reportingYear}</th>
          <th></th>
        </tr>
        <tr>
          <th>Scope</th>
          <th>Category</th>
          <th>Notes</th>
          <th>
            t<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E} />
          </th>
          <th>% of total</th>
          <th>
            t<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E} />
          </th>
          <th>% of total</th>
          <th>% changes</th>
        </tr>
      </thead>
      <tbody>
        {Object.keys(report?.scopeBasedEmissionResults).map((scope) => {
          return (
            <React.Fragment key={scope}>
              <tr>
                <td
                  rowSpan={
                    report?.scopeBasedEmissionResults[scope].categories.length +
                    1
                  }
                >
                  {scope}
                </td>
              </tr>
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
                  let currentPercentageCO2eOfTotal = cat.percentageCO2eOfTotal;
                  return (
                    <React.Fragment key={cat.category}>
                      <tr>
                        <td>{cat.category}</td>
                        <td>-</td>
                        <td>{parseFloat(baseTotalCO2eEmissions).toFixed(2)}</td>
                        <td>
                          {parseFloat(basePercentageCO2eOfTotal).toFixed(2)}
                        </td>
                        <td>
                          {parseFloat(currentTotalCO2eEmissions).toFixed(2)}
                        </td>
                        <td>
                          {parseFloat(currentPercentageCO2eOfTotal).toFixed(2)}
                        </td>
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
                <td>{scope} </td>
                <td>-</td>
                <td>
                  {parseFloat(
                    reportBaseYear?.scopeBasedEmissionResults[scope]
                      .grandTotalCO2eEmissions
                  ).toFixed(2)}
                </td>
                <td>
                  {parseFloat(
                    reportBaseYear?.scopeBasedEmissionResults[scope]
                      .grandPercentageCO2eOfTotal
                  ).toFixed(2)}
                </td>
                <td>
                  {parseFloat(
                    report?.scopeBasedEmissionResults[scope]
                      .grandTotalCO2eEmissions
                  ).toFixed(2)}
                </td>
                <td>
                  {parseFloat(
                    report?.scopeBasedEmissionResults[scope]
                      .grandPercentageCO2eOfTotal
                  ).toFixed(2)}
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
              {scope === CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_3 && (
                <tr className="text-dark">
                  <td className="bg-warning">Total (FERA)</td>
                  <td className="bg-warning">
                    Fuel and Energy Related Activities{" "}
                  </td>
                  <td className="bg-warning">-</td>
                  <td className="bg-warning">
                    {parseFloat(
                      reportBaseYear?.totalFuelAndEnergyAcitivites
                    ).toFixed(2)}
                  </td>
                  <td className="bg-warning">-</td>
                  <td className="bg-warning">
                    {parseFloat(report?.totalFuelAndEnergyAcitivites).toFixed(
                      2
                    )}
                  </td>
                  <td className="bg-warning">-</td>
                  <td
                    className={traceChangeColorClass(
                      traceNumericChanges(
                        reportBaseYear?.totalFuelAndEnergyAcitivites,
                        report?.totalFuelAndEnergyAcitivites
                      ).number
                    )}
                  >
                    {
                      traceNumericChanges(
                        reportBaseYear?.totalFuelAndEnergyAcitivites,
                        report?.totalFuelAndEnergyAcitivites
                      ).string
                    }
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
        <tr className="text-dark bg-secondary-light">
          <td>Total results</td>
          <td>Scope 1, 2 & 3 </td>
          <td>-</td>
          <td>
            {parseFloat(
              reportBaseYear?.scopeBasedEmissionSummary.grandTotalCO2eEmissions
            ).toFixed(2)}
          </td>
          <td>
            {parseFloat(
              reportBaseYear?.scopeBasedEmissionSummary
                .grandPercentageCO2eOfTotal
            ).toFixed(2)}
          </td>
          <td>
            {parseFloat(
              report?.scopeBasedEmissionSummary.grandTotalCO2eEmissions
            ).toFixed(2)}
          </td>
          <td>
            {parseFloat(
              report?.scopeBasedEmissionSummary.grandPercentageCO2eOfTotal
            ).toFixed(2)}
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
        <tr className="text-dark">
          <td>Out of Scope</td>
          <td>{report?.outOfScopeEmissionResults?._id}</td>
          <td>-</td>
          <td>
            {parseFloat(
              reportBaseYear?.outOfScopeEmissionResults
                .totalGhgBiogenicCo2Emission
            ).toFixed(2)}
          </td>
          <td>-</td>
          <td>
            {parseFloat(
              report?.outOfScopeEmissionResults.totalGhgBiogenicCo2Emission
            )}
          </td>
          <td>-</td>
          <td
            className={traceChangeColorClass(
              traceNumericChanges(
                reportBaseYear?.outOfScopeEmissionResults
                  .totalGhgBiogenicCo2Emission,
                report?.outOfScopeEmissionResults.totalGhgBiogenicCo2Emission
              ).number
            )}
          >
            {
              traceNumericChanges(
                reportBaseYear?.outOfScopeEmissionResults
                  .totalGhgBiogenicCo2Emission,
                report?.outOfScopeEmissionResults.totalGhgBiogenicCo2Emission
              ).string
            }
          </td>
        </tr>

        <tr className="text-dark ">
          <td rowSpan={3}>Intensity ratio</td>
        </tr>
        <tr className="text-dark ">
          <td>
            t<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E} />
            /1£m of turnover{" "}
          </td>
          <td>-</td>
          <td>
            {parseFloat(
              reportBaseYear?.intensityRatio.totalCO2ePerMillionOfTurnOver
            ).toFixed(2)}
          </td>
          <td>-</td>
          <td>
            {parseFloat(
              report?.intensityRatio.totalCO2ePerMillionOfTurnOver
            ).toFixed(2)}
          </td>
          <td>-</td>
          <td
            className={traceChangeColorClass(
              traceNumericChanges(
                reportBaseYear?.intensityRatio.totalCO2ePerMillionOfTurnOver,
                report?.intensityRatio.totalCO2ePerMillionOfTurnOver
              ).number
            )}
          >
            {
              traceNumericChanges(
                reportBaseYear?.intensityRatio.totalCO2ePerMillionOfTurnOver,
                report?.intensityRatio.totalCO2ePerMillionOfTurnOver
              ).string
            }
          </td>
        </tr>
        <tr className="text-dark">
          <td>
            t<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E} />
            /employee{" "}
          </td>
          <td>-</td>
          <td>
            {parseFloat(
              reportBaseYear?.intensityRatio.totalCO2ePerEmployee
            ).toFixed(2)}
          </td>
          <td>-</td>
          <td>
            {parseFloat(report?.intensityRatio.totalCO2ePerEmployee).toFixed(2)}
          </td>
          <td>-</td>
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
  );
}

export default EmissionsCategoriesTable;
