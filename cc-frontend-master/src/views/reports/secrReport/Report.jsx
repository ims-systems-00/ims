import {
  Col,
  Container,
  Row,
  Spinner,
  Table,
} from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { Box } from "../../../components/Box";
import SelectInput from "../../../components/SelectInput";
import useTraceNumericChanges from "../../../hooks/useTraceNumericChanges";
import { useSecrReport } from "./store";
import { useParameters } from "../../../store/parametersStore";
import brandConfig from "config.js";

export default function Report() {
  const { traceChangeColorClass, traceNumericChanges } =
    useTraceNumericChanges();
  const {
    secrReport,
    isSecrReportLoading,
    reportingYear,
    compareYear,
    setReportingYear,
    setCompareYear,
  } = useSecrReport();

  const { reportingPeriods = [] } = useParameters();

  if (isSecrReportLoading || !secrReport)
    return (
      <div className="content border-top text-center">
        Loading <Spinner size="sm" />
      </div>
    );

  const { reportingYear: reportData, compareYear: compareData } = secrReport;

  // Energy rows
  const energyRows = [
    {
      label: "Stationary Combustion",
      old: compareData.energy.stationaryCombustion,
      new: reportData.energy.stationaryCombustion,
    },
    {
      label: "Mobile Combustion",
      old: compareData.energy.mobileCombustion,
      new: reportData.energy.mobileCombustion,
    },
    {
      label: "Purchased Electricity",
      old: compareData.energy.purchasedElectricity,
      new: reportData.energy.purchasedElectricity,
    },
    {
      label: "Business Travel (Grey Fleet)",
      old: compareData.energy.businessTravelGreyFleet,
      new: reportData.energy.businessTravelGreyFleet,
    },
    {
      label: <b>Total Energy Consumption</b>,
      old: compareData.energy.totalEnergyConsumption,
      new: reportData.energy.totalEnergyConsumption,
    },
  ];

  // Emissions rows
  const emissionsRows = [
    {
      label: "Stationary Combustion",
      old: compareData.emissions.stationaryCombustion,
      new: reportData.emissions.stationaryCombustion,
    },
    {
      label: "Mobile Combustion",
      old: compareData.emissions.mobileCombustion,
      new: reportData.emissions.mobileCombustion,
    },
    {
      label: "Purchased Electricity",
      old: compareData.emissions.purchasedElectricity,
      new: reportData.emissions.purchasedElectricity,
    },
    {
      label: "Business Travel (Grey Fleet)",
      old: compareData.emissions.businessTravelGreyFleet,
      new: reportData.emissions.businessTravelGreyFleet,
    },
  ];

  // Intensity Ratio rows
  const intensityRows = [
    {
      label: "Turnover",
      old: compareData.intensityRatio.Turnover,
      new: reportData.intensityRatio.Turnover,
      prefix: "£",
    },
    {
      label: "tCO₂e per £1,000,000 of turnover",
      old: compareData.intensityRatio.tCO2ePerMillionTurnover,
      new: reportData.intensityRatio.tCO2ePerMillionTurnover,
    },
  ];

  function renderPercentChangeCell(oldVal, newVal) {
    const { number, string } = traceNumericChanges(oldVal, newVal);
    return (
      <span className={traceChangeColorClass(number)}>{string || "+0"}%</span>
    );
  }

  return (
    <div className="content border-top">
      <Container>
        <div className="py-5 ">
          <Row>
            <Col md="9" className="mx-auto">
              <Box>
                <h4 className="text-center mb-2">
                  Streamlined Energy and Carbon Reporting
                </h4>
                <div className="text-center mb-2 border-bottom pb-3">
                  GHG emissions and energy use data for the {reportData.year}{" "}
                  reporting period
                </div>
                <Table>
                  <thead className="bg-secondary-extra-light">
                    <tr>
                      <th></th>
                      <th>
                        <SelectInput
                          label="Compare Year"
                          value={compareYear}
                          onChange={setCompareYear}
                          options={reportingPeriods.map((rp) => ({
                            value: rp.year,
                            label: rp.year,
                          }))}
                        />
                      </th>
                      <th>
                        <SelectInput
                          label="Reporting Year"
                          value={reportingYear}
                          onChange={setReportingYear}
                          options={reportingPeriods.map((rp) => ({
                            value: rp.year,
                            label: rp.year,
                          }))}
                        />
                      </th>
                      <th></th>
                    </tr>
                  </thead>
                  <thead className="bg-secondary-extra-light">
                    <tr>
                      <th>Energy (kWh) per Category</th>
                      <th>{compareData.year}</th>
                      <th>{reportData.year}</th>
                      <th className="text-end">% Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {energyRows.map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.label}</td>
                        <td>{row.old.toLocaleString()}</td>
                        <td>{row.new.toLocaleString()}</td>
                        <td className="text-end">
                          {renderPercentChangeCell(row.old, row.new)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <thead className="bg-secondary-extra-light">
                    <tr>
                      <th>Emissions (tCO₂e) per Category</th>
                      <th>{compareData.year}</th>
                      <th>{reportData.year}</th>
                      <th className="text-end">% Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emissionsRows.map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.label}</td>
                        <td>{row.old.toLocaleString()}</td>
                        <td>{row.new.toLocaleString()}</td>
                        <td className="text-end">
                          {renderPercentChangeCell(row.old, row.new)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <thead>
                    <tr>
                      <th>
                        <b>Total Emissions</b>
                      </th>
                      <th>
                        {compareData.emissions.totalEmissions.toLocaleString()}
                      </th>
                      <th>
                        {reportData.emissions.totalEmissions.toLocaleString()}
                      </th>
                      <th className="text-end">
                        {renderPercentChangeCell(
                          compareData.emissions.totalEmissions,
                          reportData.emissions.totalEmissions
                        )}
                      </th>
                    </tr>
                  </thead>
                  <thead className="bg-secondary-extra-light">
                    <tr>
                      <th>Intensity Ratio Metric</th>
                      <th>{compareData.year}</th>
                      <th>{reportData.year}</th>
                      <th className="text-end">% Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intensityRows.map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.label}</td>
                        <td>
                          {row.prefix || ""}
                          {row.old.toLocaleString()}
                        </td>
                        <td>
                          {row.prefix || ""}
                          {row.new.toLocaleString()}
                        </td>
                        <td className="text-end">
                          {renderPercentChangeCell(row.old, row.new)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <h4 className="mt-3 mb-2">Methodology</h4>
                <div className="text-secondary">
                  The GHG assessment was conducted with the support of{" "}
                  {brandConfig.brandName}. The methodology of{" "}
                  {brandConfig.brandName} conforms to The GHG Protocol Standard
                  and ISO14064-1. Activity data entered into the calculator were
                  multiplied by conversion factors published by the Department
                  for Environment, Food & Rural Affairs and the Department for
                  Energy Security and Net Zero.
                </div>
              </Box>
            </Col>
          </Row>
        </div>
      </Container>
    </div>
  );
}
