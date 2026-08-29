import { Card, Col, Row, Badge } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import reportSingleYearThumbNail from "../../assets/image/report-single-year-thumbnail.png";
import reportBaseYearCompareThumbNail from "../../assets/image/report-base-year-compare-thumbnail.png";
import reportHistoricTrendsThumbNail from "../../assets/image/report-hitoric-trends-thumbnail.png";
import report14064GhgStatementhumbNail from "../../assets/image/report-14064-ghg-statement-thumbnail.png";
import report14064FullThumbNail from "../../assets/image/report-14064-full-thumbnail.png";
import reportSECRThumbNail from "../../assets/image/secr-report.png";
import reportScienceBasedTargetThumbNail from "../../assets/image/science-based-targets.png";

import { Link } from "react-router-dom";
import TourStep from "../../components/TourStep";
function ReportsContainer() {
  return (
    <div className="content">
      <h4 className="text-bold">Reports</h4>
      {/* <p>This is a place that contains all reports.</p> */}

      <Row className={"my-3"}>
        <Col md="3">
          <Link to="/single-year-report">
            <Card className={"report-tile border-0 rounded-3"}>
              <div className="image-container d-flex align-items-center justify-contents-center">
                <img
                  src={reportSingleYearThumbNail}
                  alt="single year report"
                  className="img-fluid"
                />
              </div>
              <div className="p-3">
                <p className="text-dark">Results - Single Year</p>
                <span>
                  <Badge fade="success">Included</Badge>
                </span>
              </div>
            </Card>
          </Link>
        </Col>
        <Col md="3">
          <Link to="/base-year-compare-report">
            <Card className={"report-tile border-0 rounded-3"}>
              <div className="image-container d-flex align-items-center justify-contents-center">
                <img
                  src={reportBaseYearCompareThumbNail}
                  alt="base year compare report"
                  className="img-fluid"
                />
              </div>
              <div className="p-3">
                <p className="text-dark">Results - Base Year Compare</p>
                <span>
                  <Badge fade="success">Included</Badge>
                </span>
              </div>
            </Card>
          </Link>
        </Col>
        <Col md="3">
          <Link to="/historic-trends-report">
            <Card className={"report-tile border-0 rounded-3"}>
              <div className="image-container d-flex align-items-center justify-contents-center">
                <img
                  src={reportHistoricTrendsThumbNail}
                  alt="historic trends report"
                  className="img-fluid"
                />
              </div>
              <div className="p-3">
                <p className="text-dark">Historic Trends Report</p>
                <span>
                  <Badge fade="success">Included</Badge>
                </span>
              </div>
            </Card>
          </Link>
        </Col>
        <Col md="3">
          <Link to="/ghg-statement">
            <Card className={"report-tile border-0 rounded-3"}>
              <div className="image-container d-flex align-items-center justify-contents-center">
                <img
                  src={report14064GhgStatementhumbNail}
                  alt="historic trends report"
                  className="img-fluid"
                />
              </div>
              <div className="p-3">
                <p className="text-dark">14064 GHG Statement</p>
                <span>
                  <Badge fade="primary">Premium</Badge>
                </span>
              </div>
            </Card>
          </Link>
        </Col>
        <Col md="3">
          <TourStep stepId={"iso-14064-full-report"}>
            <Link to="/iso-14064-full-report">
              <Card className={"report-tile border-0 rounded-3"}>
                <div className="image-container d-flex align-items-center justify-contents-center">
                  <img
                    src={report14064FullThumbNail}
                    alt="14064 Full report"
                    className="img-fluid"
                  />
                </div>
                <div className="p-3">
                  <p className="text-dark">14064 Full Report</p>
                  <span>
                    <Badge fade="primary">Premium</Badge>
                  </span>
                </div>
              </Card>
            </Link>
          </TourStep>
        </Col>
        <Col md="3">
          <Link to="/secr-report">
            <Card className={"report-tile border-0 rounded-3"}>
              <div className="image-container d-flex align-items-center justify-contents-center">
                <img
                  src={reportSECRThumbNail}
                  alt="SECR report"
                  className="img-fluid"
                />
              </div>
              <div className="p-3">
                <p className="text-dark">SECR Report</p>
                <span>
                  <Badge fade="primary">Premium</Badge>
                </span>
              </div>
            </Card>
          </Link>
        </Col>
        <Col md="3">
          <Link to="#">
            <Card className={"report-tile border-0 rounded-3"}>
              <div className="image-container d-flex align-items-center justify-contents-center">
                <img
                  src={reportScienceBasedTargetThumbNail}
                  alt="science based target report"
                  className="img-fluid"
                />
              </div>
              <div className="p-3">
                <p className="text-dark">Science Based Targets Report</p>
                <span>
                  <Badge fade="warning">Coming Soon</Badge>
                </span>
              </div>
            </Card>
          </Link>
        </Col>
      </Row>
    </div>
  );
}

export default ReportsContainer;
