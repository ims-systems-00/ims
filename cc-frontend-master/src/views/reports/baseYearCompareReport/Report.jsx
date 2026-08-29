import {
  Col,
  Row,
  InputGroup,
  InputGroupText,
  Select,
} from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { useParameters } from "../../../store/parametersStore";
import Notes from "../shared/Notes";
import ReportContents from "../shared/ReportContents";
import CategoryEmissionChart from "./CategoryEmissionChart";
import DataTable from "./DataTable";
import SYRActivityEmissionChart from "./SYRActivityEmissionChart";
import SYRScopeEmissionChart from "./SYRScopeEmissionChart";
import { useBaseYearCompareReport } from "./store";
import ScopeEmissionChart from "./ScopeEmissionChart";
import IntensityRatioChart from "./IntensityRatioChart";
import Loading from "../../../components/Loading";
import { useOrganisation } from "../../../store/organisationStore";

function Report() {
  let { reportingPeriods } = useParameters();
  const {
    isReportLoading,
    report,
    selectedReportingYear,
    selectReportingYear,
  } = useBaseYearCompareReport();
  const { organisation } = useOrganisation();

  if (isReportLoading) return <Loading />;
  if (!report) return "Report not loaded";
  return (
    <React.Fragment>
      <div className="border-bottom">
        <ReportContents className="d-flex justify-content-between">
          <div className="">
            <h4>{organisation.name}</h4>
            <p>Greenhouse Gas (GHG) Results</p>
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
      </ReportContents>
      <Notes />
      <ReportContents>
        <Row>
          <Col md={12}>
            <h5 className="text-center mb-5">
              {selectedReportingYear?.value} Emission break down
            </h5>
          </Col>
          <Col md={4}>
            <p className="text-dark text-center mb-2">
              {selectedReportingYear?.value} Emissions by Scope
            </p>
            <SYRScopeEmissionChart />
          </Col>
          <Col md={8}>
            <p className="text-dark text-center mb-2">
              {selectedReportingYear?.value} Emissions by Activities
            </p>
            <SYRActivityEmissionChart />
          </Col>
          <Col md={12}>
            <h5 className="text-center my-5">
              {selectedReportingYear?.value} Emission History
            </h5>
          </Col>
          <Col md={6}>
            <p className="text-dark text-center mb-2">Emissions by Scope</p>
            <ScopeEmissionChart />
          </Col>
          <Col md={6}>
            <p className="text-dark text-center mb-2">Intensity Ratio</p>
            <IntensityRatioChart />
          </Col>
          <Col md={12}>
            <p className="text-dark text-center mb-2">
              {selectedReportingYear?.value} Emissions by Categories
            </p>
            <CategoryEmissionChart />
          </Col>
        </Row>
      </ReportContents>
    </React.Fragment>
  );
}

export default Report;
