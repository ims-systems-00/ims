import { Badge, Col, Row } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import CC_CONSTANTS from "../../../constants";
import {
  CC_DATA_QUALITY_INFORMATION_EXAMPLE_1,
  CC_DATA_QUALITY_INFORMATION_EXAMPLE_2,
  CC_DATA_QUALITY_INFORMATION_EXAMPLE_3,
} from "./exampleData";
import { Link } from "react-router-dom";
function Guidelines() {
  return (
    <div className="guidelines-container">
      <div className="mb-5 text-center">
        <h3>Welcome to your Calculator</h3>
        <p>
          A calculation tool for estimating an organisation's greenhouse gas
          emissions in accordance with the GHG Protocol and ISO14064-1.
        </p>
      </div>
      <h4>1. Company and Contact Details</h4>
      <h3>Data Quality Grading</h3>
      <p>
        Reporting Company {"Interface NRM Ltd"} Company Number {4615780}
        Contact Name{" "}
        {
          "Kay Hill	Registered Address	e-Innovation Centre, Telford Campus, Priorslee, Telford, Shropshire, TF2 9FT"
        }
        Contact Email {"kay@interface-nrm.co.uk"} Company Description{" "}
        {`Interface NRM is a UKAS Accredited Certification body, providing ISO 9001, ISO 14001, ISO 45001, FSC® and PEFC Certification. We are the only UKAS Accredited Certification Body based in
                 Shropshire and one of the leading Certification Companies within the UK.`}
        Contact Position {"Finance Manager"}
      </p>
      <h4>2. Company and Contact Details</h4>
      <Row>
        <Col md="6">
          <h4>2.1 Company and Contact Details</h4>
          <p>
            The Reporting Year must be 12 months and correspond with the
            Reporting Company's financial year. The Emission Factor Database
            Year refers to the edition of the UK Government GHG Conversion
            Factors for Company Reporting that will be applied to the activity
            data to calculate emissions (except when custom emission factors are
            used). UK Government advises that factors from the calendar year in
            which the greatest portion of your data falls should be applied. For
            example, the 2022 factors will be applied to data in reporting year
            01/04/22 – 31/03/23. This version of the Calculator (V5) includes
            the UK Government emission factors for 2020, 2021, 2022 and 2023.
            Reporting Years pre-dating 2020 will default to the 2020 emission
            factors. Reporting Years starting from July 2024 will use the 2023
            emission factors until the Calculator is updated (scheduled for July
            2024).
          </p>
        </Col>
        <Col md="6">
          <h4>2.2 Company and Contact Details</h4>
          <p>
            Reporting companies can track emissions by month throughout this
            calculator.
          </p>
          <p>
            The order of these months should reflect the reporting period e.g. a
            Reporting Year of 01/04/2022 - 31/03/2023 will start with Apr and
            end with Mar.
          </p>
        </Col>
      </Row>
      <h4>3. Reporting Structure </h4>
      <Row>
        <Col md="4">
          <h4> 3.1 Base Year</h4>
          <p>
            The Base Year should represent a stable reference point for the
            Reporting Company's operations, including data availability and
            organisational structure.
          </p>
          <p>
            Emissions targets will be compared to the Base Year, therefore this
            year will not change. It may, however, need to be recalculated in
            the future.
          </p>
        </Col>
        <Col md="4">
          <h4>3.2 Reporting Year</h4>
          <p>
            Please choose the latest Reporting Year. This year will feature in
            the automated reports later in the spreadsheet. This can be updated
            when new reporting years are completed.
          </p>
        </Col>
        <Col md="4">
          <h4>3.3 Reporting Method</h4>
          <p>
            Please select which reporting method will be used for the primary
            results. Whichever method is chosen, the alternative results will be
            shown in a footnote.
          </p>
          <p>
            Location-based reporting reflects the average emissions intensity of
            grids on which energy consumption occurs, attributing emissions
            based on geographical location. Market-based reporting, on the other
            hand, reflects the choice a company makes in procuring power and its
            associated emissions benefits. It allows companies to claim the
            benefits of their specific green power purchases and contracts, such
            as renewable energy certificates, separate from their physical
            location's grid emissions.
          </p>
        </Col>
      </Row>
      <h4>4. Reporting Boundaries</h4>
      <Row>
        <Col md="4">
          <h4> 4.1 Organisational Boundary</h4>
          <p>
            The Organisational Boundary refers to the limits set by an
            organisation for accounting and reporting its greenhouse gas
            emissions. It helps determine which of the three scopes the
            organisation's facilities, assets and operations will need to be
            accounted for in.
          </p>
          <p>
            Most companies will adopt the Operational Control approach, meaning
            any leased assets (buildings, offices, vehicles etc.) will be
            accounted for in scope 1 and scope 2. For more information about
            choosing an organisational boundary, please speak to Nero.
          </p>
          <h6>Operational Control</h6>
        </Col>
        <Col md="4">
          <h4> 4.2 Locations</h4>
          <p>
            {" "}
            If the Reporting Company has multiple locations, sites or buildings
            within its Organisational Boundary, these should be listed here.
          </p>
          <p>
            Locations can be selected in every section of this calculator,
            allowing emissions to be compared across locations.
          </p>
        </Col>
        <Col md="4">
          <h4>4.3 Reporting Boundaries</h4>
          <p>
            Please review each of the emissions categories and define which are
            relevant to your organisation.
          </p>
          <Link>HErer</Link>
        </Col>
      </Row>
      <h4>5. Target Setting</h4>
      <Row>
        <Col md="6">
          <h4> 5.1 Net Zero Target Year</h4>
          <p>
            Please select your chosen year to reach Net Zero. This can be no
            later that 2050 and it is unlikely to be achieved before 2030.
          </p>
        </Col>
        <Col md="6">
          <h4> 5.2 Net Zero Reduction Ambition</h4>
          <p>
            To reach Net Zero, organisations need to reduce their absolute scope
            1, 2 & 3 emissions by a minimum of 90%. Please select the level of
            reduction committed to.
          </p>
          {2040} {90}%
        </Col>
      </Row>
      <hr></hr>
      <p>
        Throughout the Nero GHG calculator, users will need to grade submitted
        <b>Activity</b> data and <b>Custom Emission Factors</b>.
      </p>
      <p>
        In GHG reporting, the quality of activity data is critical. A grading
        scale helps evaluate data precision and reliability, essential for
        accurate emissions inventories. This approach standardises assessments,
        highlights areas for improvement, and tracks data quality over time,
        enabling organisations to enhance their data collection methods
        systematically.
      </p>
      <p>Advice for using the grading scale:</p>
      <ul>
        <li>Consistently apply the criteria across data types.</li>
        <li>Keep thorough records of data sources.</li>
        <li>Aim for third-party verification to attain top grades.</li>
        <li>
          Regularly review data quality to identify and address issues promptly.
        </li>
        <li>Set objectives to improve data quality in each reporting cycle.</li>
        <li>
          Ensure all team members are trained in data collection and understand
          the grading scale's importance.
        </li>
        <li>
          Use technology to bolster data accuracy and collection efficiency.
        </li>
        <li>
          Recognise your data's limitations, make prudent assumptions where
          necessary, and transparently disclose these in reports.
        </li>
      </ul>
      <p>
        Adopting this structured grading strategy ensures robust GHG reporting
        and supports informed decision-making for emission reductions.
      </p>
      <hr></hr>
      <Row>
        {Object.values(CC_CONSTANTS.CC_DATA_QUALITY_GRADES).map((grade) => {
          let data = CC_CONSTANTS.CC_DATA_QUALITY_INFORMATION[grade];
          return (
            <Col md="3" className="mb-3">
              <div className="p-3 bg-secondary-extra-light rounded-3">
                <h3 className="mb-2">
                  {grade}{" "}
                  <span className="pull-right">
                    <Badge fade="primary">{data.DEFINITION}</Badge>
                  </span>
                </h3>{" "}
                <hr></hr>
                <h5>Activity Data Criteria</h5>
                <p className="mb-2">{data.ACTIVITY_DATA_CRITERIA}</p>
                <h5>Emission Factor Criteria</h5>
                <p>{data.EMISSION_FACTOR_CRITERIA}</p>
              </div>
            </Col>
          );
        })}
      </Row>
      <h3>Example 1 - Purchased Electricity (Scope 2)</h3>
      <hr></hr>
      <Row>
        {Object.values(CC_CONSTANTS.CC_DATA_QUALITY_GRADES).map((grade) => {
          let data = CC_DATA_QUALITY_INFORMATION_EXAMPLE_1[grade];
          return (
            <Col md="3" className="mb-3">
              <div className="p-3 bg-secondary-extra-light rounded-3">
                <h3 className="mb-2">
                  {grade}{" "}
                  <span className="pull-right">
                    <Badge fade="primary">{data.DEFINITION}</Badge>
                  </span>
                </h3>{" "}
                <hr></hr>
                <h5>Activity Data Criteria</h5>
                <p className="mb-2">{data.ACTIVITY_DATA_CRITERIA}</p>
                <h5>Emission Factor Criteria</h5>
                <p>{data.EMISSION_FACTOR_CRITERIA}</p>
              </div>
            </Col>
          );
        })}
      </Row>
      <h3>
        Example 2 - Purchased Paper (Scope 3, Purchased Goods and Services)
      </h3>
      <hr></hr>
      <Row>
        {Object.values(CC_CONSTANTS.CC_DATA_QUALITY_GRADES).map((grade) => {
          let data = CC_DATA_QUALITY_INFORMATION_EXAMPLE_2[grade];
          return (
            <Col md="3" className="mb-3">
              <div className="p-3 bg-secondary-extra-light rounded-3">
                <h3 className="mb-2">
                  {grade}{" "}
                  <span className="pull-right">
                    <Badge fade="primary">{data.DEFINITION}</Badge>
                  </span>
                </h3>{" "}
                <hr></hr>
                <h5>Activity Data Criteria</h5>
                <p className="mb-2">{data.ACTIVITY_DATA_CRITERIA}</p>
                <h5>Emission Factor Criteria</h5>
                <p>{data.EMISSION_FACTOR_CRITERIA}</p>
              </div>
            </Col>
          );
        })}
      </Row>
      <h3>
        Example 3 - Transport of Sold Printed Products (Scope 3, Upstream
        Transport)
      </h3>
      <hr></hr>
      <Row>
        {Object.values(CC_CONSTANTS.CC_DATA_QUALITY_GRADES).map((grade) => {
          let data = CC_DATA_QUALITY_INFORMATION_EXAMPLE_3[grade];
          return (
            <Col md="3" className="mb-3">
              <div className="p-3 bg-secondary-extra-light rounded-3">
                <h3 className="mb-2">
                  {grade}{" "}
                  <span className="pull-right">
                    <Badge fade="primary">{data.DEFINITION}</Badge>
                  </span>
                </h3>{" "}
                <hr></hr>
                <h5>Activity Data Criteria</h5>
                <p className="mb-2">{data.ACTIVITY_DATA_CRITERIA}</p>
                <h5>Emission Factor Criteria</h5>
                <p>{data.EMISSION_FACTOR_CRITERIA}</p>
              </div>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}

export default Guidelines;
