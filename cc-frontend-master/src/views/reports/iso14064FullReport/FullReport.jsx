import React from "react";
import { PiCaretUpDownBold } from "react-icons/pi";
import checkMarkImage from "../../../assets/image/checkmark-1.svg";
import lineVectorOne from "../../../assets/image/line-vector-one.svg";
import { GasInChemicalFormat } from "../../../components/GasInChemicalFormat";
import CC_CONSTANTS from "../../../constants";
import { useOrganisation } from "../../../store/organisationStore";
import { useParameters } from "../../../store/parametersStore";
import Article from "./Article";
import DataQualityResultsTable from "./DataQualityResultsTable";
import GHGBreakDownTable from "./GHGBreakDownTable";
import Subtitle from "./SubTitle";
import Title from "./Title";

import {
  Alert,
  Col,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Row,
  Table,
  UncontrolledDropdown,
} from "@ims-systems-00/ims-ui-kit";
import classNames from "classnames";
import brandConfig from "config.js";
import moment from "moment";
import { MdLightbulbOutline } from "react-icons/md";
import { Bold } from "../../../components/Bold";
import { Box } from "../../../components/Box";
import Loading from "../../../components/Loading";
import TourStep from "../../../components/TourStep";
import RichText from "../../sharedSections/components/RichText";
import ActivitySummaryTableByCategory from "../shared/ActivitySummaryTableByCategory";
import CategoryEmissionCompareChart from "./CategoryEmissionCompareChart";
import EmissionsCategoriesTable from "./EmissionsCategoriesTable";
import SYRCategoryEmissionChart from "./SYRCategoryEmissionChart";
import { useISO14064FullReport } from "./store";
function PrimaryHighlightedText({ children }) {
  return <span className="text-primary">{children}</span>;
}
function WarningHighlightedText({ children }) {
  return <span className="text-danger">{children}</span>;
}

function FullReport() {
  const { parameter, reportingPeriods, isParameterLoading } = useParameters();
  const {
    isReportLoading,
    report,
    selectedReportingYear,
    selectReportingYear,
    initiativesIdentified,
    initiativesImplemented,
  } = useISO14064FullReport();
  console.log("initiatives", initiativesIdentified);
  const { organisation } = useOrganisation();
  if (isReportLoading) return <Loading />;

  const plannedActions = [
    "Improve data collection and monitoring systems to ensure accurate and consistent activity data.",
    "Conduct regular reviews of emission factors to identify updates or refinements that may improve accuracy.",
    "Invest in training and capacity-building for our environmental management team to enhance their understanding of GHG quantification methodologies and best practices.",
    "Engage with suppliers and seek primary emission factors which meet the quality standards described by the GHG Protocol.",
  ];

  // Extracting data for emissions tables
  const extractData = (scopeIndex) => {
    return CC_CONSTANTS.CC_CATEGTORIES_WITH_DETAILS[scopeIndex].categories.map(
      (category) => {
        let relevance =
          parameter?.reportingBoundaries.find(
            (boundary) => boundary.category === category.name
          )?.relevance || "";

        return {
          category: category.name,
          description: category.description,
          examples: category.example,
          explanation: category.explanation[relevance],
          relevance: relevance,
        };
      }
    );
  };
  const dataQualityInformationData = () => {
    return Object.keys(CC_CONSTANTS.CC_DATA_QUALITY_INFORMATION).map(
      (gradeKey) => {
        const grade = gradeKey;
        const data = CC_CONSTANTS.CC_DATA_QUALITY_INFORMATION[gradeKey];
        return {
          grade: grade,
          definition: data.DEFINITION,
          activityDataCriteria: data.ACTIVITY_DATA_CRITERIA,
          emissionFactorCriteria: data.EMISSION_FACTOR_CRITERIA,
        };
      }
    );
  };

  const extractedScope1Data = extractData(0);
  const extractedScope2Data = extractData(1);
  const extractedScope3Data = extractData(2);

  const dataQualityInformation = dataQualityInformationData();

  const getReportingPeriod = () => {
    return `${reportingPeriods.find((rp) => rp.year === selectedReportingYear?.year)
        ?.startDate
      }
          -
          ${reportingPeriods.find(
        (rp) => rp.year === selectedReportingYear?.year
      )?.endDate
      }`;
  };

  if (isParameterLoading || isReportLoading) return "Loading report...";
  if (!parameter || !report) return "Report not loaded";

  return (
    <div className="px-5 text-justify iso-14064-full-report">
      {/* header section */}
      <header className="py-3 mb-3 rounded-3 shadow-sm">
        <img src={lineVectorOne} className="background" alt="" />
        <img
          src={checkMarkImage}
          className="position-relative top-0 start-50 translate-middle"
          alt=""
        />
        <div className="px-3 py-2">
          <h3 className="mb-5 text-center">
            <u>Carbon Footprint Report</u>
          </h3>
          <div className="mb-2">
            <strong>Company Name:</strong> {organisation?.name}
          </div>
          <div className="mb-2">
            <strong>Address:</strong> {organisation?.addressStreet}
          </div>
          <div className="mb-2">
            <strong>Reporting Year:</strong>
            <TourStep stepId={"select-year-of-report"}>
              <UncontrolledDropdown className="d-inline mx-2">
                <DropdownToggle className="border-0 text-dark">
                  {selectedReportingYear?.year} <PiCaretUpDownBold />
                </DropdownToggle>
                <TourStep stepId={"selected-first-year"}>
                  <DropdownMenu className={"mb-3"}>
                    {reportingPeriods?.map((rp) => (
                      <DropdownItem
                        className={classNames("", {
                          "text-primary":
                            selectedReportingYear?.year === rp.year,
                        })}
                        key={rp.year}
                        onClick={() => {
                          selectReportingYear(rp);
                        }}
                      >
                        {rp.year} ({rp.startDate} - {rp.endDate})
                      </DropdownItem>
                    ))}
                  </DropdownMenu>
                </TourStep>
              </UncontrolledDropdown>
            </TourStep>
          </div>
          <div className="mb-2">
            <strong>Reporting Period:</strong> {getReportingPeriod()}
          </div>
          <div className="mb-2">
            <strong>Responsibility for the Report:</strong>{" "}
            {organisation.contactName} - {organisation.contactPosition}
          </div>
        </div>
      </header>
      <Alert color="warning" className="border border-warning">
        This carbon footprint report describes the inventory following ISO
        14064-1 requirements and the Greenhouse Gas (GHG) Protocol. The analysis
        shows that our total carbon emissions were{" "}
        <Bold>
          {report?.scopeBasedEmissionSummary?.grandTotalCO2eEmissions}
        </Bold>{" "}
        tonne of {<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E} />}{" "}
        for the period.
        <br></br>
        <br></br>
        In addition to reviewing the absolute footprint, this report also
        benchmarks emissions <Bold>“per £ million turnover”</Bold> and{" "}
        <Bold>“per full-time employee (FTE)”</Bold>- shown in Table 4.3. As
        opposed to absolute metrics, these intensity metrics provide relative t
        <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E} /> figures
        for organisational carbon footprints.
      </Alert>
      <Box>
        <div>
          {/* 1. company Goals  */}

          <div className="py-3">
            <Title>1. Goals and Objectives</Title>

            <Article>
              This Carbon Footprint Report provides a detailed examination of
              our carbon emissions (our carbon footprint) and details the
              methodology and approach taken. It has been prepared in accordance
              with ISO 14064-1:2018. It presents a detailed inventory of our
              direct (Scope 1) and indirect (Scopes 2 and 3) GHG emissions. We
              have established clear organisational and operational boundaries,
              identified data sources and included reliability metrics to ensure
              data accuracy and transparency.
            </Article>
            <Article>
              We use this report and the underlying data to review our carbon
              footprint and emission sources. Our ultimate goal is to manage and
              reduce our emissions more effectively to reach net zero. The
              report is intended for a broad audience, including investors,
              customers, employees, and the public.
            </Article>

            <Article>
              This report covers our reporting year{" "}
              <Bold>{selectReportingYear.year} </Bold> from{" "}
              <Bold>{selectReportingYear.startDate} </Bold> to
              <Bold>{selectReportingYear.endDate} </Bold> and will be updated
              annually to ensure our stakeholders receive timely and accurate
              information.
            </Article>

            <Article>
              The <Bold>{brandConfig.brandName}</Bold> generated the data for
              this report with the support of Bom Systems Ltd, a specialist
              technical carbon consultancy{" "}
              <a
                href="https://www.bom-systems.co.uk"
                target="_blank"
                rel="noopener noreferrer"
              >
                (www.bom-systems.co.uk)
              </a>
              .
            </Article>

            <Alert color="primary" className="border border-primary">
              <MdLightbulbOutline /> A copy of this report is available upon
              request and circulated freely.
            </Alert>
          </div>

          {/* 2. organisational Boundaries  */}

          <div className="py-3">
            <Title>2. Organisational Boundaries</Title>

            <Article>
              This GHG report covers all of our operations and facilities. We
              have established the organisational boundaries for our GHG
              inventory using the <b>{parameter?.organisationalBoundary}</b>{" "}
              approach, as defined in section 5.1 of ISO 14064-1:2018.
              {/* <PrimaryHighlightedText>
              {organisation?.name}
            </PrimaryHighlightedText>
            's operations, including our facilities, vehicles, and other assets.
            We have established the organisational boundaries for our GHG
            inventory using the{" "}
            <PrimaryHighlightedText>
              {parameter?.organisationalBoundary}
            </PrimaryHighlightedText>{" "}
            approach, as defined by ISO 14064-1. This means that we are
            reporting emissions from all facilities and activities where the
            organisation has operational control, regardless of any financial
            stake in those assets. */}
            </Article>
            <Article>
              Sources of GHG emissions have been identified and categorised
              according to the ISO 14064-1:2018 standard (Annex B) and the
              categories used in the GHG Protocol, which fall under scopes 1, 2,
              and 3.
            </Article>
            <Article>
              <ul>
                <Bold>Scope 1:</Bold> Direct emissions from sources that we own
                or control, such as stationary combustion, mobile combustion,
                industrial processes, and fugitive emissions.
              </ul>
              <ul>
                <Bold>Scope 2:</Bold>Indirect emissions from imported
                (purchased) electricity consumption.
              </ul>
              <ul>
                <Bold>Scope 3:</Bold> Other indirect emissions in our value
                chain, including transportation, products purchased and used,
                indirect and distribution, and commuting. More details about the
                reporting boundaries appear later in this report.
              </ul>
            </Article>
            <Subtitle>Consolidation Methodology</Subtitle>

            <Article>
              Following the <b>{parameter?.organisationalBoundary}</b> approach,
              we have accounted for 100 per cent of the GHG emissions over which
              we have <b>{parameter?.organisationalBoundary}</b>. This process
              involves identifying and categorising all relevant emission
              sources within our organisational boundaries. We select
              appropriate quantification methodologies for each emission source,
              aligning with ISO 14064-1 and the GHG Protocol.
            </Article>
            <Article>
              We collected activity data, such as energy consumption, travel and
              purchases, and applied relevant emission factors to calculate our
              GHG emissions, primarily the appropriate DEFRA/BEIS/DESNZ factors.
              Finally, we consolidated the emissions data to provide a clear and
              transparent GHG inventory.
            </Article>
            <Article>
              To consolidate our emissions and ensure we meet the outlined
              criteria, we have utilised the "{brandConfig.brandName}" developed
              by{" "}
              <a
                href="https://www.imssystems.tech"
                target="_blank"
                rel="noopener noreferrer"
              >
                iMS Technologies
              </a>
              . The appendix of this report provides more details about this
              model.
            </Article>
          </div>

          {/* 3. Emission Categories  */}

          <div className="py-3">
            <Title>3. Reporting Boundaries</Title>

            <Article>
              The categories used for our report are those defined by the GHG
              protocol and Annex B of ISO 14064-1. As far as possible, we have
              included all our emissions from our activities under our
              <b>{parameter?.organisationalBoundary}</b> at a 5% materiality
              threshold. The tables and graphs below explain and justify the
              inclusion and exclusion of each category. Those emission
              categories we excluded appear as either NR (not relevant, i.e. an
              activity we do not conduct or below the total <Bold>5%</Bold>{" "}
              materiality threshold) or RNC (relevant, not calculated). 's GHG
              inventory."
            </Article>
            <Subtitle>Scope 1 (Direct Emissions) :</Subtitle>
            <Article>
              Scope 1 emissions are direct emissions from sources owned or
              controlled by us. We have included all scope 1 emissions in our
              footprint.
            </Article>
            <Subtitle>Scope 2 (Indirect Emissions) :</Subtitle>
            <Article>
              Scope 2 emissions are indirect emissions associated with importing
              (purchasing) electricity and other energy (heat and steam),
              including emissions from power plants that produce the energy we
              purchase and any fugitive emissions from processes we own or
              control. We have included all identified scope 2 emissions in our
              footprint.
            </Article>
            <Subtitle>Scope 3 (Other Indirect Emissions):</Subtitle>
            <Article>
              These are other indirect emissions that occur outside of our
              organisational boundaries but are attributable to our activities.
              This covers the recommended ISO 14064-1 categories of Indirect GHG
              emissions from transportation, products used, the use of sold
              products, and emissions from other sources, further divided into
              the 15 scope 3 emission categories defined by the GHG Protocol.
            </Article>
            <Article>
              We have identified and quantified the relevant greenhouse gas
              (GHG) sources for each emissions category using appropriate
              quantification methodologies and emission factors, as outlined in
              the {brandConfig.brandName} methodology (see Annex). This approach
              ensures that our GHG inventory offers a comprehensive and
              transparent overview of our emissions across all our activities
              and operations.
            </Article>

            {/* <EmissionsTable data={extractedScope1Data} />

            <EmissionsTable data={extractedScope2Data} />
            <EmissionsTable data={extractedScope3Data} /> */}
            {/* <Article>
            For each emissions category, we have identified and quantified the
            relevant GHG sources, using appropriate quantification methodologies
            and emission factors, as described in Chapter 2."&" This ensures
            that our GHG inventory provides a comprehensive and transparent
            overview of{" "}
            <PrimaryHighlightedText>
              {organisation?.name}
            </PrimaryHighlightedText>
            's emissions performance across all our activities and operations.
          </Article> */}
          </div>

          {/* 4. Quantified GHG inventory of emissions */}

          <div className="py-3">
            <Title>4. Quantified GHG Inventory of Emissions and Removals</Title>

            <Subtitle>
              4.1 Emissions in the {selectedReportingYear?.year} Reporting Year
            </Subtitle>
            <Row>
              <Col md="12">
                <Alert color="warning" className="border border-warning">
                  <SYRCategoryEmissionChart />
                </Alert>
              </Col>
              {/* <Col md="3">
              <Alert color="warning" className="border border-warning">
                <SYRScopeEmissionChart />
              </Alert>
            </Col> */}
            </Row>
            <Subtitle>4.2 Changes in Emissions Since the Base Year</Subtitle>

            <Row>
              <Col md="12">
                <Alert color="warning" className="border border-warning">
                  <CategoryEmissionCompareChart />
                </Alert>
              </Col>
              {/* <Col md="3">
              <Alert color="warning" className="border border-warning">
                <ScopeEmissionChart />
              </Alert>
            </Col> */}
            </Row>

            <Subtitle>4.3 Results by Emissions Category</Subtitle>

            <EmissionsCategoriesTable />

            <Subtitle>4.4 Data and Emission Factors</Subtitle>
            <Article>
              Our activity data was gathered from internal records and external
              suppliers. Emission factors were obtained from reliable secondary
              databases, including those published annually by DEFRA/BEIS/DESNZ.
              BOM Systems Ltd has independently verified custom emission
              factors. Any changes to published emission factors or updates to
              data sources have been documented and explained in the Annex.
            </Article>

            <Subtitle>4.5 Uncertainties and Accuracy Impacts</Subtitle>
            <Article>
              For each emission source, the activity data quality and the
              corresponding emission factor were rated on a scale ranging from
              Very Good Data Quality (4) to Basic Data Quality (1). By
              calculating the weighted average of these grades, we determined
              the overall quality of each emissions category for each reporting
              year. The details of the data quality categories are in the Annex.
            </Article>

            <Subtitle>4.6 Actions for Reducing Uncertainty</Subtitle>
            <Article>
              We are committed to continuously improving our reporting of GHG
              emissions to ensure comprehensive and transparent disclosure. To
              reduce uncertainty in our future greenhouse gas (GHG) inventories,
              we plan to enhance our data collection and monitoring systems to
              ensure that our reporting is more granular and consistent. We also
              want to focus on developing custom emission factors where
              feasible.
            </Article>
            {/* <WarningHighlightedText>
            <List items={plannedActions} />
          </WarningHighlightedText> */}
          </div>
          {/* 5. Appendix  */}

          <div className="py-5">
            <Title>5. Annex - Methodology and Supporting Information</Title>

            <Subtitle>5.1 Quantification Model and Methodology</Subtitle>
            <Article>
              This report used the{" "}
              <PrimaryHighlightedText>
                {brandConfig?.brandName}
              </PrimaryHighlightedText>
              , an online tool developed and managed by{" "}
              <a
                href="https://www.imssystems.tech"
                target="_blank"
                rel="noopener noreferrer"
              >
                iMS Technologies
              </a>
              , as the model and tool for estimating GHG emissions. The
              methodology and approach comply with the GHG Protocol Corporate
              Accounting and Reporting Standard, The GHG Protocol Corporate
              Value Chain (Scope 3) Standard, and ISO 14064-1:2018.
            </Article>
            <Article>
              The calculator performed the GHG assessment based on activity data
              from our records, which was multiplied by externally published
              emission factors from reputable public sources, primarily the
              Department for Environment, Food & Rural Affairs (DEFRA) /BEIS.
            </Article>
            <h4 className="text-center my-3">
              Activity Data x GHG Emission Factor = Total Emissions
            </h4>
            <Article>
              The Kyoto Protocol GHGs were calculated separately where
              appropriate and then converted and quantified as tonnes of carbon
              dioxide equivalent (t
              <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E} />) to
              calculate their Global Warming Potential (GWP), expressed relative
              to the GWP of one unit of carbon dioxide. The GWPs used in our
              calculations are from the Intergovernmental Panel on Climate
              Change (IPCC) 'IPCC Global Warming Potential Values v 2.0 August
              2024', using the AR6 values.
            </Article>

            <Article>
              Secondary emission factors related to volume, mass, and distances
              were obtained from the UK Government's Department for Environment,
              Food & Rural Affairs (DEFRA), the Department for Business and
              Energy Strategy (BEIS and the Department for Energy Security and
              Net Zero (DESNZ) Conversion Factors databases.
            </Article>
            <Article>
              Emission factors based on expenditure were sourced from DEFRA's UK
              and England's carbon footprint conversion factors, categorised by
              SIC code.
            </Article>
            <Article>
              Custom emission factors are typically based on an Environmental
              Product Declaration or other type of Life Cycle Assessment from
              supply chain partners based on ISO 14040-14044 standards. Quality
              standards such as boundary definitions, compliance, and
              completeness must be met. We require these to have been
              independently verified. They are otherwise based on published,
              verified information, such as publicly available energy tariffs.
              All custom factors we use meet the data quality requirements
              specified in the GHG Protocol Corporate Value Chain (Scope 3)
              Accounting and Reporting Standard.
            </Article>
            <Alert color="warning" className="border border-warning">
              The justification for this approach is that the{" "}
              <PrimaryHighlightedText>
                {" "}
                {brandConfig?.brandName}
              </PrimaryHighlightedText>
              has been verified against ISO 14064-1 by a UKAS-accredited
              Verification Body (Interface NRM Ltd) and, as such, complies with
              the Greenhouse Gas (GHG) Protocol and ensures emissions are
              accurately represented according to widely recognised standards
              and methodologies. The calculator is an online tool that ensures
              that it can be controlled and updated effectively and that all the
              emissions factors are locked to prevent calculation errors. This
              approach ensures that the results can be consistently reproduced.
            </Alert>
            {/* <WarningHighlightedText>
            <List
              items={[
                "Structural changes: Significant changes in the company's organisational structure, such as mergers, acquisitions, divestitures, or the inclusion/exclusion of specific operations or facilities, which impact the comparability of the GHG emissions data.",
                "Methodological changes: Changes in GHG quantification methodologies, emission factors, or activity data that materially affect the accuracy and comparability of the base year emissions data.",
                "Discovery of errors: Identification of significant errors or omissions in the base year emissions data that materially impact the accuracy and comparability of the data.",
              ]}
            />
          </WarningHighlightedText> */}
            <Subtitle>5.2 Base Year</Subtitle>
            <Article>
              Our base year shows changes in our emissions over time, allowing
              us to conduct comparative analyses in tracking and reporting GHG
              emissions and develop meaningful and consistent comparisons of
              emissions over time.
            </Article>
            <Article>
              Our base year was selected because it is representative and
              provides an accurate reference point for our operations, data
              availability, and organisational structure. It was the first year
              we recorded our emissions in sufficient detail to give a reliable
              emissions figure, and it avoids unusual trading years (such as
              those around COVID-19 or unusual corporate activity).
            </Article>
            <Article>
              To consistently track our emissions over time, we shall
              recalculate base year emissions{" "}
              <Bold> according to the following recalculation policy</Bold>
              if significant changes in company structure or GHG inventory
              methodology occur. This will maintain consistency and enable
              meaningful comparisons of the inventory over time.
            </Article>
            <Article>
              We will recalculate the base year emissions under the following
              circumstances if they have a significant impact on the inventory:
            </Article>
            <Article>
              <Bold>Structural changes,</Bold> such as mergers, acquisitions,
              divestments, outsourcing, and insourcing;
            </Article>

            <Article>
              <Bold>Changes in calculation methodologies,</Bold> improvements in
              data accuracy, or discovery of significant errors;
            </Article>
            <Article>
              <Bold>Changes in the categories</Bold> or activities included in
              the Scope 3 inventory.
            </Article>
            <Article>
              Our policy defines a significant change as altering base year
              emissions by ten per cent or greater. As part of the base year
              emissions recalculation policy, we will establish and disclose
              this significance threshold that triggers base year emissions
              recalculations.
            </Article>

            <Article>
              If a recalculation is necessary, we will accurately recalculate
              the base year emissions using the same approach applied in the
              current reporting year, taking into account the identified changes
              or errors, and ensure consistency with the current reporting year.
              We will document the reasons for the recalculation, the steps
              taken, and the impact on the base year emissions data and update
              the GHG inventory.
            </Article>

            <Subtitle>5.3 Biogenic Emissions</Subtitle>
            <Article>
              Biogenic Emissions have been calculated and reported per Annex D
              of the ISO 14064-1 standard.
            </Article>
            <Subtitle>5.4 Treatment of Electricity</Subtitle>
            <Article>
              Electricity is treated according to Annex E of the ISO 14064-1
              standard. Our GHG assessment utilises both location-based and
              market-based reporting methods.{" "}
              <a href="#iso-14064-full-report-ref-1">[1]</a> This dual approach
              comprehensively explains our electricity-related GHG emissions. We
              ensure that the quality criteria of Annex E of ISO 14064-1 are met
              for our market-based reporting.
            </Article>

            <Title>6. Data Quality and Uncertainty</Title>
            <Article>
              The approach to data quality for this report is that the activity
              data were entered into the {brandConfig.brandName} using the
              qualification table shown below, with a qualitative data
              assessment, which uses the approach defined within the GHG
              Corporate Value Chain (Scope 3) Accounting and Reporting Standard
              (see Box 7.2).
            </Article>

            <Table>
              <thead className="bg-secondary-extra-light">
                <tr>
                  <th>Activity Data Grade</th>
                  <th>Activity Data Criteria</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(CC_CONSTANTS.CC_DATA_QUALITY_INFORMATION).map(
                  (data) => {
                    return (
                      <tr>
                        <td>{data.DEFINITION}</td>
                        <td>{data.ACTIVITY_DATA_CRITERIA}</td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </Table>

            <Subtitle>6.1 Data Quality Full Results</Subtitle>
            <DataQualityResultsTable />

            <Title>
              7. GHG Breakdown of Direct Emissions for{" "}
              {selectedReportingYear?.year}
            </Title>
            <Article>
              ISO14064-1 requires reporting organisations to report Direct
              emissions (Scope 1) separated by individual GHG gasses. These
              gasses are presented in tonnes of carbon dioxide equivalent (t
              <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E} />
              ).
            </Article>
            <GHGBreakDownTable />

            <Title>
              8. Activity Breakdown for {selectedReportingYear?.year}
            </Title>
            <Article>
              All activity and emissions data for the{" "}
              <PrimaryHighlightedText>
                {selectedReportingYear?.year}
              </PrimaryHighlightedText>{" "}
              reporting year.
            </Article>
            <ActivitySummaryTableByCategory
              reportingYear={selectedReportingYear?.year}
            />

            <Title>
              9. Emission Reduction Targets
            </Title>

            <Article>
              The organisation is committed to managing and reducing its emissions in accordance with the Programme
              requirements. Table 8 provides details of the emission reduction targets to be implemented. These are 'SMART'
              targets (specific, measurable, achievable, realistic, and time-constrained).
            </Article>

            <Article>
              In line with the organisation's commitment to SBTi and Scotland and UK Government Targets, we will continue
              to look for more sustainable alternatives to fossil fuels for our vehicles, such as HVO fuel, EVs, and Renewable
              CNG.
            </Article>

            <Article>
              We are currently focused on completing the Anaerobic Digestor plant, which would help us completely reduce
              our Scope 2 emissions and contribute to the principles of the circular economy. While the construction is
              ongoing, we will purchase electricity produced using renewable energy sources.
            </Article>

            <Article>
              In order to reduce the embodied carbon emissions associated with the purchase of structural steel, we will
              continue to procure lower embodied carbon steel.
            </Article>

            <Article>
              GHG per tonne of fabricated steel increased from 76kgCO2e/t in the base year 2019-2020 to 120kgCO2e/t in
              2023-2024 (Scope 1 & 2 GHG emission categories only). This is due to the significant increase in Scope 1
              emissions associated with diesel purchases for steel deliveries.
            </Article>

            <Title>9.1 Emission Reduction Initiatives (Identified)</Title>

            <Table className="w-100" style={{ tableLayout: "fixed" }}>
              <thead className="bg-secondary-extra-light">
                <tr>
                  <th style={{ width: "20%" }}>Objective</th>
                  <th style={{ width: "25%" }}>Project</th>
                  {/* <th>Responsibility</th> */}
                  <th style={{ width: "15%" }}>Completion Date</th> {/* implemented at er date ta hobe, jodi date na thake, tahole not implemented */}
                  <th style={{ width: "20%" }}>Potential co-benefits</th>
                  <th style={{ width: "20%" }}>Potential unintended consequences</th>
                  {/* <th>Actions to minimise unintended consequence</th> */}
                </tr>
              </thead>
              <tbody>
                {(!initiativesIdentified || initiativesIdentified.length === 0) && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted">
                      No data available
                    </td>
                  </tr>
                )}
                {initiativesIdentified?.map((it) => (
                  <tr key={it?._id}>
                    <td className="text-break">{it?.title || ""}</td>
                    <td className="text-break">
                      {it?.description ? (
                        <RichText value={it.description} readOnly />
                      ) : (
                        ""
                      )}
                    </td>
                    <td className="text-break">
                      {it?.implementedAt
                        ? moment(it.implementedAt).format("DD/MM/YYYY")
                        : "Not implemented"}
                    </td>
                    <td className="text-break">
                      {it?.potentialCoBenefits ? (
                        <RichText value={it.potentialCoBenefits} readOnly />
                      ) : (
                        "n/a"
                      )}
                    </td>
                    <td className="text-break">
                      {it?.potentialUnintendedConsequences ? (
                        <RichText
                          value={it.potentialUnintendedConsequences}
                          readOnly
                        />
                      ) : (
                        "n/a"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <Title className="mt-4">Emission Reduction Initiatives (Implemented)</Title>
            <Table className="w-100" style={{ tableLayout: "fixed" }}>
              <thead className="bg-secondary-extra-light">
                <tr>
                  <th style={{ width: "20%" }}>Objective</th>
                  <th style={{ width: "25%" }}>Project</th>
                  <th style={{ width: "15%" }}>Completion Date</th>
                  <th style={{ width: "20%" }}>Potential co-benefits</th>
                  <th style={{ width: "20%" }}>Potential unintended consequences</th>
                </tr>
              </thead>
              <tbody>
                {(!initiativesImplemented || initiativesImplemented.length === 0) && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted">
                      No data available
                    </td>
                  </tr>
                )}
                {initiativesImplemented?.map((it) => (
                  <tr key={it?._id}>
                    <td className="text-break">{it?.title || ""}</td>
                    <td className="text-break">
                      {it?.description ? (
                        <RichText value={it.description} readOnly />
                      ) : (
                        ""
                      )}
                    </td>
                    <td className="text-break">
                      {it?.implementedAt
                        ? moment(it.implementedAt).format("DD/MM/YYYY")
                        : "Not implemented"}
                    </td>
                    <td className="text-break">
                      {it?.potentialCoBenefits ? (
                        <RichText value={it.potentialCoBenefits} readOnly />
                      ) : (
                        "n/a"
                      )}
                    </td>
                    <td className="text-break">
                      {it?.potentialUnintendedConsequences ? (
                        <RichText
                          value={it.potentialUnintendedConsequences}
                          readOnly
                        />
                      ) : (
                        "n/a"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <Subtitle>References</Subtitle>
            <p id="iso-14064-full-report-ref-1">
              1. Location-based reporting calculates Scope 2 emissions based on
              the average emissions intensity of the grid where electricity is
              consumed, using emission factors specific to the geographical
              region, regardless of the source. This is straightforward to
              calculate, but the origin of the electricity (renewable or fossil
              fuel) is not considered.{" "}
            </p>
            <br></br>
            <p id="iso-14064-full-report-ref-2">
              2. Market-based reporting considers the specific energy purchased,
              including Renewable Energy Certificates (RECs), etc., to offset
              emissions. It allows accounting efforts to support cleaner energy
              sources and reduce the carbon footprint associated with purchased
              energy.
            </p>
          </div>
        </div>
      </Box>
    </div>
  );
}

export default FullReport;
