import {
  Row,
  InputGroup,
  InputGroupText,
  Select,
  Table,
} from "@ims-systems-00/ims-ui-kit";
import React from "react";
import CC_CONSTANTS from "../../../constants";
import { useParameters } from "../../../store/parametersStore";
import ReportContents from "../shared/ReportContents";
import DataTable from "./DataTable";
import { useSingleYearReport } from "./store";
import Loading from "../../../components/Loading";
import { useOrganisation } from "../../../store/organisationStore";
import { GasInChemicalFormat } from "../../../components/GasInChemicalFormat";
function Report() {
  let { reportingPeriods } = useParameters();
  const {
    isReportLoading,
    report,
    selectedReportingYear,
    selectReportingYear,
  } = useSingleYearReport();
  const { organisation } = useOrganisation();

  if (isReportLoading) return <Loading />;
  if (!report) return "Report not loaded";
  return (
    <React.Fragment>
      <div className="border-bottom">
        <h3 className="text-center mb-3">
          Greenhouse Gas Statement ({report?.reportingYear})
        </h3>
        <p className="text-center">
          Justification for the inclusion and exclusion of emission categories
          can be found in the full GHG Report.
        </p>
        <ReportContents className="d-flex justify-content-between">
          <div className="">
            <h4>{organisation?.name}</h4>
            <p>
              Person responsible for the report{" "}
              <span className="text-dark">{organisation.contactName}</span>
            </p>
          </div>
          <div className="text-end">
            <InputGroup>
              <InputGroupText>
                Reporting Year: {selectedReportingYear?.year || ""}
              </InputGroupText>
              <Select
                defaultValue={{
                  value: selectedReportingYear?.year,
                  label: `${
                    selectedReportingYear?.startDate || "dd/mm/yyyy"
                  } - ${selectedReportingYear?.endDate || "dd/mm/yyyy"}`,
                }}
                options={reportingPeriods.map((rp) => ({
                  value: rp.year,
                  label: `${rp.startDate} - ${rp.endDate}`,
                }))}
                onChange={(e) => {
                  selectReportingYear(
                    reportingPeriods.find((rp) => rp.year === e.value)
                  );
                }}
              />
            </InputGroup>
          </div>
        </ReportContents>
      </div>
      <ReportContents>
        <DataTable />
        <Table className={"mt-5"}>
          <tbody>
            <tr className="text-dark">
              <td colSpan={4}>Biogenic GHG Emissions (Reported saperately)</td>
            </tr>
            <tr className="text-success">
              <td colSpan={4} className="border-0">
                <i>
                  {" "}
                  Treatment of biogenic GHG emissions compliant with ISO 14064-1
                  Annex D{" "}
                </i>
              </td>
            </tr>
            {report.outOfScopeEmissionResults.breakdown
              .filter((item) => item)
              .map((item) => {
                return (
                  <tr key={item._id}>
                    <td className="border-0">{item._id}</td>
                    <td className="border-0">
                      {" "}
                      {item.totalGhgBiogenicCo2Emission}
                    </td>
                    <td className="border-0">
                      t
                      <GasInChemicalFormat
                        gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E}
                      />
                    </td>
                  </tr>
                );
              })}

            <tr className="text-dark">
              <td className="">Total Biogenic Emissions</td>

              <td className="">
                {report.outOfScopeEmissionResults.totalGhgBiogenicCo2Emission}
              </td>
              <td className="">tonne t{CC_CONSTANTS.CC_GHG_GASSES.CO2E}</td>
            </tr>
          </tbody>
        </Table>

        <Table className={"mt-5"}>
          <tbody>
            <tr className="text-dark">
              <td colSpan={3}>Contractual instruments for GHG attributes</td>
            </tr>
            <tr className="text-success">
              <td colSpan={3} className="border-0 ">
                <i>
                  {" "}
                  Market-based emission factors compliant with ISO 14064-1 Annex
                  E{" "}
                </i>
              </td>
            </tr>
            <tr>
              <td className="border-0">
                Total Renewable Electricity purcjased
              </td>
              <td className="border-0">
                {
                  report.contractualInstrumemtsForGHGResults
                    .totalRenewablePurchasedElectricity
                }
              </td>
              <td className="border-0">kWh</td>
            </tr>
            <tr>
              <td className="border-0">
                Market-based emissions from electricity
              </td>

              <td className="border-0">
                {
                  report.contractualInstrumemtsForGHGResults
                    .totalMarketBasedElectricityEmissionsCO2e
                }
              </td>
              <td className="border-0">
                t{<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E} />}
              </td>
            </tr>
            <tr className="text-dark">
              <td className="">Total Direct and Indirect GHG emissions</td>

              <td className="">
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
              <td className="">t{CC_CONSTANTS.CC_GHG_GASSES.CO2E}</td>
            </tr>
          </tbody>
        </Table>
      </ReportContents>
      <ReportContents>
        <Row></Row>
      </ReportContents>
    </React.Fragment>
  );
}

export default Report;
