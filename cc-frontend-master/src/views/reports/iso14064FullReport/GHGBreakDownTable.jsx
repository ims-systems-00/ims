import { Table } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { useISO14064FullReport } from "./store";
import CC_CONSTANTS from "../../../constants";
import { GasInChemicalFormat } from "../../../components/GasInChemicalFormat";

function GHGBreakDownTable() {
  const { report, isReportLoading } = useISO14064FullReport();
  if (isReportLoading) return null;
  return (
    <Table>
      <thead className="bg-secondary-extra-light">
        <tr>
          <th className="">Category</th>
          <th className="">t<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E}/></th>
          <th className="">Carbon Dioxide (<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2}/>)</th>
          <th className="">Methane (<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CH4}/>)</th>
          <th className="">Nitrous Oxide (<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.N2O}/>)</th>
          <th className="">Hydro-flurocarbons (<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.HFC}/>)</th>
          <th className="">Per-flurocarbons (<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.PFC}/>)</th>
          <th className="">Sulphur hexaflouride (<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.SF6}/>)</th>
          <th className="">Nitrogen triflouride (<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.NF3}/>)</th>
        </tr>
      </thead>
      <tbody>
        {report?.scopeBasedEmissionResults[
          CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_1
        ].categories.map((cat) => {
          return (
            <React.Fragment key={cat.category}>
              <tr>
                <td>{cat.category}</td>
                <td>{parseFloat(cat.totalCO2eEmissions).toFixed(2)}</td>
                <td>{parseFloat(cat.totalCO2Emissions).toFixed(2)}</td>
                <td>{parseFloat(cat.totalCH4Emissions).toFixed(2)}</td>
                <td>{parseFloat(cat.totalN2OEmissions).toFixed(2)}</td>
                <td>{parseFloat(cat.totalHFCEmissions).toFixed(2)}</td>
                <td>{parseFloat(cat.totalPFCEmissions).toFixed(2)}</td>
                <td>{parseFloat(cat.totalSF6Emissions).toFixed(2)}</td>
                <td>{parseFloat(cat.totalNF3Emissions).toFixed(2)}</td>
              </tr>
            </React.Fragment>
          );
        })}
        <tr className="text-dark bg-secondary-light">
          <td>Total</td>
          <td>
            {parseFloat(
              report?.scopeBasedEmissionResults[
                CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_1
              ].grandTotalCO2eEmissions
            ).toFixed(2)}
          </td>
          <td>0</td>
          <td>0</td>
          <td>0</td>
          <td>0</td>
          <td>0</td>
          <td>0</td>
          <td>0</td>
        </tr>
      </tbody>
    </Table>
  );
}

export default GHGBreakDownTable;
