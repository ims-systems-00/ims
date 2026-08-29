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
          <th className="">Scope</th>
          <th className="">Category</th>
          <th className="">Notes</th>
          <th className="">
            t<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E} />
          </th>
          <th className="">
            Carbon Dioxide (
            <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2} />)
          </th>
          <th className="">
            Methane (
            <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CH4} />)
          </th>
          <th className="">
            Nitrous Oxide (
            <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.N2O} />)
          </th>
          <th className="">
            <div>
              Hydro-flurocarbons (
              <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.HFC} />
              s)
            </div>
          </th>
          <th className="">
            Per-flurocarbons (
            <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.PFC} />
            s)
          </th>
          <th className="">
            Sulphur hexaflouride (
            <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.SF6} />)
          </th>
          <th className="">
            Nitrogen triflouride (
            <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.NF3} />)
          </th>
          <th className="">Activity Data Quality Grade</th>
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
                        {scope === CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_1 && (
                          <React.Fragment>
                            <td>
                              {parseFloat(cat.totalCO2Emissions).toFixed(2)}
                            </td>
                            <td>
                              {parseFloat(cat.totalCH4Emissions).toFixed(2)}
                            </td>
                            <td>
                              {parseFloat(cat.totalN2OEmissions).toFixed(2)}
                            </td>
                            <td>
                              {parseFloat(cat.totalHFCEmissions).toFixed(2)}
                            </td>
                            <td>
                              {parseFloat(cat.totalPFCEmissions).toFixed(2)}
                            </td>
                            <td>
                              {parseFloat(cat.totalSF6Emissions).toFixed(2)}
                            </td>
                            <td>
                              {parseFloat(cat.totalNF3Emissions).toFixed(2)}
                            </td>
                          </React.Fragment>
                        )}
                        {[
                          CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_2,
                          CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_3,
                        ].includes(scope) && (
                          <td
                            colSpan={7}
                            className="bg-secondary-light border-0"
                          ></td>
                        )}
                        <td>{cat.adGrade}</td>
                        <td>{cat.efGrade}</td>
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
                  <td>
                    {parseFloat(report?.totalFuelAndEnergyAcitivites).toFixed(
                      2
                    )}
                  </td>
                  <td colSpan={7} className="bg-secondary-light border-0"></td>
                  <td>-</td>
                  <td>-</td>
                </tr>
              )}
              <tr className="text-dark bg-secondary-light">
                <td>Total</td>
                <td>{scope} </td>
                <td>-</td>
                <td>
                  {parseFloat(
                    report?.scopeBasedEmissionResults[scope]
                      .grandTotalCO2eEmissions
                  ).toFixed(2)}
                </td>
                {scope === CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_1 && (
                  <React.Fragment>
                    <td>
                      {parseFloat(
                        report?.scopeBasedEmissionResults[scope]
                          .grandTotalCO2Emissions
                      ).toFixed(2)}
                    </td>
                    <td>
                      {parseFloat(
                        report?.scopeBasedEmissionResults[scope]
                          .grandTotalCH4Emissions
                      ).toFixed(2)}
                    </td>
                    <td>
                      {parseFloat(
                        report?.scopeBasedEmissionResults[scope]
                          .grandTotalN2OEmissions
                      ).toFixed(2)}
                    </td>
                    <td>
                      {parseFloat(
                        report?.scopeBasedEmissionResults[scope]
                          .grandTotalHFCEmissions
                      ).toFixed(2)}
                    </td>
                    <td>
                      {parseFloat(
                        report?.scopeBasedEmissionResults[scope]
                          .grandTotalPFCEmissions
                      ).toFixed(2)}
                    </td>
                    <td>
                      {parseFloat(
                        report?.scopeBasedEmissionResults[scope]
                          .grandTotalSF6Emissions
                      ).toFixed(2)}
                    </td>
                    <td>
                      {parseFloat(
                        report?.scopeBasedEmissionResults[scope]
                          .grandTotalNF3Emissions
                      ).toFixed(2)}
                    </td>
                  </React.Fragment>
                )}
                {[
                  CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_2,
                  CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_3,
                ].includes(scope) && (
                  <td colSpan={7} className="bg-warning border-0">
                    <small>
                      <i>
                        Indirect GHG emissions are not required to be quantified
                        sperately (ISO 14064-1:2018 [9.6.3])
                      </i>
                    </small>
                  </td>
                )}
                <td></td>
                <td></td>
              </tr>
            </React.Fragment>
          );
        })}
        <tr className="text-dark">
          <td className=""></td>
          <td colSpan={2}>Total Direct and Indirect emissions</td>
          <td>
            {parseFloat(
              Object.keys(report?.scopeBasedEmissionResults).reduce(
                (total, scope) =>
                  total +
                  report?.scopeBasedEmissionResults[scope]
                    .grandTotalCO2eEmissions,
                0
              )
            ).toFixed(2)}
          </td>
          <td colSpan={9}></td>
        </tr>
      </tbody>
    </Table>
  );
}

export default DataTable;
