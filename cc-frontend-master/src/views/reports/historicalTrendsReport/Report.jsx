import { Row, Col } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { useParameters } from "../../../store/parametersStore";
import Notes from "../shared/Notes";
import ReportContents from "../shared/ReportContents";
import DataTable from "./DataTable";
import { useHistoricTrendReport } from "./store";
import CategoryEmissionChart from "./CategoryEmissionChart";
import IntensityRatioChart from "./IntensityRatioChart";
import ScopeEmissionChart from "./ScopeEmissionChart";
import Loading from "../../../components/Loading";
import { useOrganisation } from "../../../store/organisationStore";

function Report() {
  let { reportingPeriods } = useParameters();
  const { isReportLoading, report } = useHistoricTrendReport();
  const { organisation } = useOrganisation();

  if (isReportLoading) return <Loading />;
  if (!report) return "Report not loaded";
  return (
    <React.Fragment>
      <div className="border-bottom">
        <ReportContents className="d-flex justify-content-between">
          <div className="">
            <h4>{organisation?.name}</h4>
            <p>Greenhouse Gas (GHG) Results</p>
          </div>
          <div className="text-end">
            <h4>Reporting period</h4>
            <p>
              Start year{" "}
              <span className="text-dark">{report.startingYear}</span> - Current
              year <span className="text-dark">{report.endingYear} </span>
            </p>
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
            <h5 className="text-center mb-5">Emission History</h5>
          </Col>
          <Col md={6}>
            <p className="text-dark text-center mb-2">Emissions by scope</p>
            <ScopeEmissionChart />
          </Col>
          <Col md={6}>
            <p className="text-dark text-center mb-2">Intensity Ratio</p>
            <IntensityRatioChart />
          </Col>
          <Col md={12}>
            <p className="text-dark text-center mb-2">
              Emissions by Categories
            </p>
            <CategoryEmissionChart />
          </Col>
        </Row>
      </ReportContents>
    </React.Fragment>
  );
}

export default Report;
