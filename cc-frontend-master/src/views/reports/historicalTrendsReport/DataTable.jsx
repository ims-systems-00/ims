import { Table } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { useHistoricTrendReport } from "./store";
import CC_CONSTANTS from "../../../constants";
import GHGBreakDownTable from "../iso14064FullReport/GHGBreakDownTable";
import { GasInChemicalFormat } from "../../../components/GasInChemicalFormat";
function DataTable() {
  const { report } = useHistoricTrendReport();
  return (
    <Table>
      <thead className="bg-secondary-extra-light">
        <tr>
          <th>Scope</th>
          <th>Category</th>
          <th>Notes</th>
          {report.scopeBasedEmissionResults[
            CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_1
          ]?.map((data) => (
            <th key={data.year}>
              {data.year} - t
              <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E} />
            
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Object.keys(report?.scopeCategoryBasedEmissionResults).map((scope) => {
          return (
            <React.Fragment>
              <tr>
                <td
                  rowSpan={
                    report?.scopeCategoryBasedEmissionResults[scope].length + 1
                  }
                >
                  {scope}
                </td>
              </tr>
              <React.Fragment>
                {report?.scopeCategoryBasedEmissionResults[scope].map((cat) => {
                  return (
                    <React.Fragment key={cat.category}>
                      <tr>
                        <td>{cat._id.category}</td>
                        <td>-</td>
                        {cat.calculations.map((calc) => (
                          <td key={calc.year}>{calc.totalCO2eEmissions}</td>
                        ))}
                      </tr>
                    </React.Fragment>
                  );
                })}
                {/* {scope === CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_3 && (
                  <tr>
                    <td>FERA</td>
                    <td>-</td>
                    {report?.totalFuelAndEnergyAcitivites}
                  </tr>
                )} */}
              </React.Fragment>
            </React.Fragment>
          );
        })}
      </tbody>
    </Table>
  );
}

export default DataTable;
