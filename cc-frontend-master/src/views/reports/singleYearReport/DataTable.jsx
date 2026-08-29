import { Table } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { useSingleYearReport } from "./store";
import CC_CONSTANTS from "../../../constants";
import { GasInChemicalFormat } from "../../../components/GasInChemicalFormat";
function DataTable() {
  const { report } = useSingleYearReport();
  return (
    <Table>
      <thead className="bg-secondary-extra-light">
        <tr>
          <th>Scope</th>
          <th>Category</th>
          <th>Notes</th>
          <th>
            {" "}
            t<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E} />{" "}
          </th>
          <th>% of total</th>
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
                  return (
                    <React.Fragment key={cat.category}>
                      <tr>
                        <td>{cat.category}</td>
                        <td>-</td>
                        <td>{cat.totalCO2eEmissions}</td>
                        <td>{cat.percentageCO2eOfTotal}</td>
                      </tr>
                    </React.Fragment>
                  );
                }
              )}
              {scope === CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_3 && (
                <tr className="text-dark bg-secondary-light">
                  <td>Total (FERA)</td>
                  <td>Fuel and Energy Related Activities </td>
                  <td>-</td>
                  <td>{report?.totalFuelAndEnergyAcitivites}</td>
                  <td>-</td>
                </tr>
              )}
              <tr className="text-dark bg-secondary-light">
                <td>Total</td>
                <td>{scope} </td>
                <td>-</td>
                <td>
                  {
                    report?.scopeBasedEmissionResults[scope]
                      .grandTotalCO2eEmissions
                  }
                </td>
                <td>
                  {
                    report?.scopeBasedEmissionResults[scope]
                      .grandPercentageCO2eOfTotal
                  }
                </td>
              </tr>
            </React.Fragment>
          );
        })}
        <tr className="text-dark bg-secondary-light">
          <td>Total results</td>
          <td>Scope 1, 2 & 3 </td>
          <td>-</td>
          <td>{report?.scopeBasedEmissionSummary.grandTotalCO2eEmissions}</td>
          <td>
            {report?.scopeBasedEmissionSummary.grandPercentageCO2eOfTotal}
          </td>
        </tr>
        <tr className="text-dark">
          <td>Out of Scope</td>
          <td>{report?.outOfScopeEmissionResults?._id}</td>
          <td>-</td>
          <td>
            {report?.outOfScopeEmissionResults.totalGhgBiogenicCo2Emission}
          </td>
          <td>-</td>
        </tr>

        <tr className="text-dark ">
          <td rowSpan={3}>Intensity Ratio</td>
        </tr>
        <tr className="text-dark ">
          <td>
            t<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E} /> /1£m
            of turnover{" "}
          </td>
          <td>-</td>
          <td>{report?.intensityRatio.totalCO2ePerMillionOfTurnOver}</td>
          <td>-</td>
        </tr>
        <tr className="text-dark">
          <td>
            t<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E} />
            /employee{" "}
          </td>
          <td>-</td>
          <td>{report?.intensityRatio.totalCO2ePerEmployee}</td>
          <td>-</td>
        </tr>
      </tbody>
    </Table>
  );
}

export default DataTable;
