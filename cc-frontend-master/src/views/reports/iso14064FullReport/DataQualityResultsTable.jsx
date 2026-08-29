import { Table } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { useISO14064FullReport } from "./store";
import CC_CONSTANTS from "../../../constants";
import { GasInChemicalFormat } from "../../../components/GasInChemicalFormat";

function DataQualityResultsTable() {
  const { report, isReportLoading } = useISO14064FullReport();
  if (isReportLoading) return null;
  return (
    <Table>
      <thead className="bg-secondary-extra-light">
        <tr>
          <th className="">Scope</th>
          <th className="">Category</th>
          <th className="">Notes</th>
          <th className="">
            t<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E} />
          </th>
          <th className="">Activity Data Weighted Quality Score</th>
          <th className="">Activity Data Quality Grade</th>
          <th className="">Emission Factor Weighted Quality Score</th>
          <th className="">Emission Factor Quality Grade</th>
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
                        <td>{parseFloat(cat.totalCO2eEmissions).toFixed(2)}</td>
                        <td>{cat.adGradeScore}</td>
                        <td>{cat.adGrade}</td>
                        <td>{cat.efGradeScore}</td>
                        <td>{cat.efGrade}</td>
                      </tr>
                    </React.Fragment>
                  );
                }
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </Table>
  );
}

export default DataQualityResultsTable;
