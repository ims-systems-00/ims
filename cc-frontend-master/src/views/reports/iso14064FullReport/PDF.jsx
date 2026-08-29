import React, { useEffect, useRef, useState } from "react";
import {
  Document,
  Page,
  Text,
  StyleSheet,
  PDFViewer,
  PDFDownloadLink,
  View,
  Image,
  Link,
} from "@react-pdf/renderer";
import brandConfig from "config.js";
import { useScreenshot } from "use-react-screenshot";
import SYRCategoryEmissionChart from "./SYRCategoryEmissionChart";
import CategoryEmissionCompareChart from "./CategoryEmissionCompareChart";
import { useParameters } from "../../../store/parametersStore";
import { useISO14064FullReport } from "./store";
import useTraceNumericChanges from "../../../hooks/useTraceNumericChanges";
import CC_CONSTANTS from "../../../constants";
import useActivitySummaryByCategory from "../../sharedHooks/useActivitySummaryByCategory";
import { useOrganisation } from "../../../store/organisationStore";
import { useSignature } from "../../user/useSignature";
import { useApplication } from "../../../store/applicationStore";
import {
  Container,
  UncontrolledDropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  FormGroup,
  Input,
  Label,
} from "@ims-systems-00/ims-ui-kit";
import { PiCaretUpDownBold } from "react-icons/pi";
import classNames from "classnames";
import { draftjsToText } from "../../sharedSections/components/draftjsToPlainText";
const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 50,
    paddingLeft: 70,
    paddingRight: 50,
    fontFamily: "Times-Roman",
  },
  contents: {},
  reportTitle: {
    textAlign: "center",
    fontSize: 24,
    marginVertical: 60,
    textDecoration: "underline",
  },
  title: {
    fontSize: 18,
    marginTop: 10,
    marginBottom: 20,
  },
  subTitle: {
    fontSize: 16,
    marginBottom: 20,
    marginTop: 10,
  },
  chart: {
    width: "100%",
    marginBottom: 20,
  },
  tableTitle: {
    fontSize: 11,
    fontFamily: "Times-Bold",
    textAlign: "center",
    marginBottom: 10,
  },
  article: {
    fontSize: 12,
    marginBottom: 10,
    lineHeight: "200%",
  },
  alert: {
    border: "1px solid #ffc107",
    backgroundColor: "#fff3cd",
    padding: 10,
    // borderRadius: 4,
    color: "#664d03",
    paddingHorizontal: 6,
    marginHorizontal: 2,
    marginBottom: 10,
  },
  alertText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: "150%",
  },
  bold: {
    fontFamily: "Times-Bold",
    fontWeight: 600,
  },
  table: {
    width: "100%",
    marginBottom: 20,
  },
  tableRow: {
    display: "flex",
    flexDirection: "row",
    borderTop: "1px solid #EEE",
    fontSize: 10,
  },
  tableCell: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 4,
    // lineHeight: "90%",
  },
  tableCellBGOrangeLighter: {
    backgroundColor: "#fef3c7",
  },
  tableCellBGOrangeLight: {
    backgroundColor: "#fed7aa",
  },

  tabelColEmptyRow: {
    width: "100%",
    paddingVertical: 10,
    textAlign: "center",
  },
  tableHeader: {
    borderTop: "none",
    backgroundColor: "#fafafa",
  },
  references: {
    fontSize: 8,
    marginBottom: 8,
  },
});

const emissionCategoriesTableStyles = StyleSheet.create({
  rowResult: {
    backgroundColor: "#fef3c7",
  },
  colBGResult: {
    backgroundColor: "#fde68a",
  },
  colBGResultSuccess: {
    backgroundColor: "#34d399",
  },
  colBGResultDanger: {
    backgroundColor: "#f87171",
  },
  colScope: {
    width: "12%",
  },
  colCategory: {
    width: "38%",
  },
  colNotes: {
    width: "10%",
  },
  coltCO2: {
    width: "15%",
  },
  colPercentageOfTotal: {
    width: "15%",
  },
  colBGCO2BaseYear: {
    backgroundColor: "#ffedd5",
  },
  colBGPercentageOfTotalBaseYear: {
    backgroundColor: "#ffedd5",
  },
  colBGCO2CurrentYear: {
    backgroundColor: "#ccfbf1",
  },
  colBGPercentageOfTotalCurrentYear: {
    backgroundColor: "#ccfbf1",
  },
  colBGOutOfScopeBaseYear: {
    backgroundColor: "#fecaca",
  },
  colBGOutOfScopeCurrentYear: {
    backgroundColor: "#fecaca",
  },
  colChanges: {
    width: "10%",
  },
});
const dateQualityResultsTableStyles = StyleSheet.create({
  colScope: {
    width: "12.5%",
  },
  colCategory: {
    width: "12.5%",
  },
  colNotes: {
    width: "12.5%",
  },
  coltCO2: {
    width: "12.5%",
  },
  colADGrade: {
    width: "12.5%",
  },
  colADGradeScore: {
    width: "12.5%",
  },
  colEFGrade: {
    width: "12.5%",
  },
  colEFGradeScore: {
    width: "12.5%",
  },
});
const dataQualityDefTableStyles = StyleSheet.create({
  colADGrade: {
    width: "25%",
  },
  colADCritatia: {
    width: "75%",
  },
  colBGVGDQ: {
    backgroundColor: "#4ade80",
  },
  colBGGDQ: {
    backgroundColor: "#86efac",
  },
  colBGFDQ: {
    backgroundColor: "#fef08a",
  },
  colBGPDQ: {
    backgroundColor: "#f87171",
  },
});
const ghgBreakDownTableStyles = StyleSheet.create({
  colCategory: {
    width: "16%",
  },
  colGHG: {
    width: "12%",
  },
});
const activitySummaryTableStyles = StyleSheet.create({
  colActivity: {
    width: "40%",
  },
  colUnit: {
    width: "20%",
  },
  colAmount: {
    width: "20%",
  },
  coltCO2: {
    width: "20%",
  },
});
const initiativeTableStyles = StyleSheet.create({
  colObjective: {
    width: "20%",
  },
  colProject: {
    width: "25%",
  },
  colCompletion: {
    width: "15%",
  },
  colBenefits: {
    width: "20%",
  },
  colUnintended: {
    width: "20%",
  },
});

const signatureStyles = StyleSheet.create({
  signatureContainer: {
    marginTop: 60,
    alignItems: "flex-end",
    alignSelf: "flex-end",
    width: "50%",
  },
  signatureImage: {
    height: 75,
    marginBottom: 15,
  },
  signatureName: {
    fontSize: 12,
    fontFamily: "Times-Bold",
    marginBottom: 3,
    textAlign: "right",
  },
  signatureOrg: {
    fontSize: 10,
    fontFamily: "Times-Roman",
    color: "#666",
    textAlign: "right",
  },
});
const Title = ({ style = {}, children }) => (
  <Text
    style={{
      ...styles.title,
      ...style,
    }}
  >
    {children}
  </Text>
);
const Subtitle = ({ style = {}, children }) => (
  <Text
    style={{
      ...styles.subTitle,
      ...style,
    }}
  >
    {children}
  </Text>
);
const Article = ({ style = {}, children }) => (
  <Text
    style={{
      ...styles.article,
      ...style,
    }}
  >
    {children}
  </Text>
);
const Contents = ({ style = {}, children }) => (
  <View
    style={{
      ...styles.contents,
      ...style,
    }}
  >
    {children}
  </View>
);
const Alert = ({ style = {}, children }) => (
  <View
    style={{
      ...styles.alert,
      ...style,
    }}
  >
    <Text style={styles.alertText}>{children}</Text>
  </View>
);
const Bold = ({ style = {}, children }) => (
  <Text
    style={{
      ...styles.bold,
      ...style,
    }}
  >
    {children}
  </Text>
);
const Cell = ({ style, children }) => {
  style = Array.isArray(style) ? style : [style];
  return <Text style={[styles.tableCell, ...style]}>{children}</Text>;
};
const ActivitySummaryByCategory = ({
  category,
  relevence,
  reportingYear,
  onLoadComplete,
}) => {
  const { report, isReportLoading } = useActivitySummaryByCategory({
    category,
    reportingYear,
  });
  useEffect(() => {
    if (!isReportLoading && report) {
      onLoadComplete(category);
    }
  }, [isReportLoading]);
  // if (
  //   !isReportLoading &&
  //   report?.length === 0 &&
  //   relevence !== CC_CONSTANTS.CC_RELEVANCE.NOT_RELEVANT
  // )
  //   return null;
  return (
    <React.Fragment>
      <Text style={styles.tableTitle}>{category}</Text>{" "}
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.bold, styles.tableHeader]}>
          <Cell style={activitySummaryTableStyles.colActivity}>Activity</Cell>
          <Cell style={activitySummaryTableStyles.colUnit}>Unit</Cell>
          <Cell style={activitySummaryTableStyles.colAmount}>Amount</Cell>
          <Cell style={activitySummaryTableStyles.coltCO2}>
            tCO2e (tonne CO2-eq)
          </Cell>
        </View>
        {relevence !== CC_CONSTANTS.CC_RELEVANCE.NOT_RELEVANT &&
          report.map((summary) => {
            return (
              <View
                key={summary._id.activity + summary._id.unit}
                style={[styles.tableRow]}
              >
                <Cell style={activitySummaryTableStyles.colActivity}>
                  {summary._id.activity}
                </Cell>
                <Cell style={activitySummaryTableStyles.colUnit}>
                  {summary._id.unit}
                </Cell>
                <Cell style={activitySummaryTableStyles.colAmount}>
                  {summary.amount}
                </Cell>
                <Cell style={activitySummaryTableStyles.coltCO2}>
                  {summary.totalCO2eEmissions}
                </Cell>
              </View>
            );
          })}
        {relevence !== CC_CONSTANTS.CC_RELEVANCE.NOT_RELEVANT &&
          report?.length === 0 && (
            <View style={[styles.tableRow]}>
              <Cell style={styles.tabelColEmptyRow}>
                Ther is no data found in this category
              </Cell>
            </View>
          )}
        {relevence === CC_CONSTANTS.CC_RELEVANCE.NOT_RELEVANT && (
          <View style={[styles.tableRow]}>
            <Cell style={styles.tabelColEmptyRow}>
              This category is not relevant to our organisation
            </Cell>
          </View>
        )}
      </View>
    </React.Fragment>
  );
};
const MakePDF = ({
  organisation = null,
  reportingYear = 2024,
  reportingStartDate = "dd/mm/yyyy",
  reportingEndDate = "dd/mm/yyyy",
  changesChartSS = "",
  reportingYearChartSS = "",
  report = null,
  reportBaseYear = null,
  reportingBoundaries = [],
  initiativesIdentified = [],
  initiativesImplemented = [],
  includeSignature = false,
  signatureUrl = null,
  signatureName = "",
  onPdfLoaded = () => {},
}) => {
  const [categorySummaryLoadStatuses, setCategorysummaryLoadStatuses] =
    useState([
      ...Object.values(CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES).map((cat) => ({
        name: cat,
        status: false,
      })),
    ]);
  function markCategorySummaryStatusAsLoaded(cat) {
    setCategorysummaryLoadStatuses((prev) => {
      return prev.map((c) => {
        if (c.name === cat) return { ...c, status: true };
        return c;
      });
    });
  }
  useEffect(() => {
    let allDone = true;
    for (let cat of categorySummaryLoadStatuses) {
      if (!cat.status) {
        allDone = false;
        break;
      }
    }
    console.log(allDone);
    if (allDone) onPdfLoaded();
  }, [categorySummaryLoadStatuses]);
  const { traceNumericChanges } = useTraceNumericChanges();
  const pdfreport = (
    <Document>
      <Page style={styles.page} size={"A4"}>
        <Contents>
          <Text style={styles.reportTitle}>Carbon Footprint Report</Text>
          <View>
            <Article>
              Company Name: <Bold> {organisation?.name}</Bold>
            </Article>
            <Article>
              Address: <Bold> {organisation?.addressStreet}</Bold>{" "}
            </Article>
            <Article>
              Reporting Period: <Bold>{reportingStartDate}</Bold> -{" "}
              <Bold>{reportingEndDate}</Bold>
            </Article>
            <Article>
              Responsibility for the Report:
              {organisation.contactName} - {organisation.contactPosition}
            </Article>
            <Article></Article>
            <Article></Article>
            <Article></Article>
            <Article>
              This carbon footprint report describes the inventory following ISO
              14064-1 requirements and the Greenhouse Gas (GHG) Protocol. The
              analysis shows that our total carbon emissions were{" "}
              <Bold>
                {report?.scopeBasedEmissionSummary?.grandTotalCO2eEmissions}
              </Bold>{" "}
              tonnes of CO2 for the period.
            </Article>
            <Article>
              In addition to reviewing the absolute footprint, this report also
              benchmarks emissions <Bold>“per £ million turnover”</Bold> and{" "}
              <Bold>“per full-time employee (FTE)”</Bold>- shown in Table 4.3.
              As opposed to absolute metrics, these intensity metrics provide
              relative tCO2e figures for organisational carbon footprints.
            </Article>
          </View>
        </Contents>
      </Page>
      <Page style={styles.page} size={"A4"}>
        <Container>
          <Title>1. Goals and Objectives</Title>

          <Article>
            This Carbon Footprint Report provides a detailed examination of our
            carbon emissions (our carbon footprint) and details the methodology
            and approach taken. It has been prepared in accordance with ISO
            14064-1:2018. It presents a detailed inventory of our direct (Scope
            1) and indirect (Scopes 2 and 3) GHG emissions. We have established
            clear organisational and operational boundaries, identified data
            sources and included reliability metrics to ensure data accuracy and
            transparency.
          </Article>
          <Article>
            We use this report and the underlying data to review our carbon
            footprint and emission sources. Our ultimate goal is to manage and
            reduce our emissions more effectively to reach net zero. The report
            is intended for a broad audience, including investors, customers,
            employees, and the public.
          </Article>

          <Article>
            This report covers our reporting year <Bold>{reportingYear} </Bold>{" "}
            from <Bold>{reportingStartDate} </Bold> to
            <Bold>{reportingEndDate} </Bold> and will be updated annually to
            ensure our stakeholders receive timely and accurate information.
          </Article>

          <Article>
            The <Bold>{brandConfig.brandName}</Bold> generated the data for this
            report with the support of Bom Systems Ltd, a specialist technical
            carbon consultancy{" "}
            <Link href="https://www.bom-systems.co.uk">
              (www.bom-systems.co.uk)
            </Link>
            .
          </Article>
          <Alert>
            A copy of this report is available upon request and circulated
            freely.
          </Alert>
        </Container>
      </Page>

      <Page style={styles.page} size={"A4"}>
        <Container>
          <Title>2. Organisational Boundaries</Title>

          <Article>
            This GHG report covers all of our operations and facilities. We have
            established the organisational boundaries for our GHG inventory
            using the Operational Control approach, as defined in section 5.1 of
            ISO 14064-1:2018.
          </Article>
          <Article>
            Sources of GHG emissions have been identified and categorised
            according to the ISO 14064-1:2018 standard (Annex B) and the
            categories used in the GHG Protocol, which fall under scopes 1, 2,
            and 3.
          </Article>
          <Article>
            <Bold>Scope 1:</Bold> Direct emissions from sources that we own or
            control, such as stationary combustion, mobile combustion,
            industrial processes, and fugitive emissions.
          </Article>
          <Article>
            <Bold>Scope 2:</Bold>Indirect emissions from imported (purchased)
            electricity consumption.
          </Article>
          <Article>
            <Bold>Scope 3:</Bold> Other indirect emissions in our value chain,
            including transportation, products purchased and used, indirect and
            distribution, and commuting. More details about the reporting
            boundaries appear later in this report.
          </Article>
          <Subtitle>Consolidation Methodology</Subtitle>

          <Article>
            Following the operational control approach, we have accounted for
            100 per cent of the GHG emissions over which we have operational
            control. This process involves identifying and categorising all
            relevant emission sources within our organisational boundaries. We
            select appropriate quantification methodologies for each emission
            source, aligning with ISO 14064-1 and the GHG Protocol.
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
            by <Link href="https://www.imssystems.tech">iMS Technologies</Link>.
            The appendix of this report provides more details about this model.
          </Article>
        </Container>
      </Page>

      <Page style={styles.page} size={"A4"}>
        <Contents>
          <Title>3. Reporting Boundaries</Title>

          <Article>
            The categories used for our report are those defined by the GHG
            protocol and Annex B of ISO 14064-1. As far as possible, we have
            included all our emissions from our activities under our operational
            control at a 5% materiality threshold. The tables and graphs below
            explain and justify the inclusion and exclusion of each category.
            Those emission categories we excluded appear as either NR (not
            relevant, i.e. an activity we do not conduct or below the total{" "}
            <Bold>5%</Bold> materiality threshold) or RNC (relevant, not
            calculated). 's GHG inventory."
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
            products, and emissions from other sources, further divided into the
            15 scope 3 emission categories defined by the GHG Protocol.
          </Article>
          <Article>
            We have identified and quantified the relevant greenhouse gas (GHG)
            sources for each emissions category using appropriate quantification
            methodologies and emission factors, as outlined in the{" "}
            {brandConfig.brandName} methodology (see Annex). This approach
            ensures that our GHG inventory offers a comprehensive and
            transparent overview of our emissions across all our activities and
            operations.
          </Article>
        </Contents>
      </Page>
      <Page orientation="landscape" style={styles.page} size={"A4"}>
        <Contents>
          <Title>4. Quantified GHG Inventory of Emissions and Removals</Title>
          <Subtitle>
            4.1 Emissions in the {reportingYear} Reporting Year
          </Subtitle>
          <Image style={styles.chart} src={reportingYearChartSS} />
        </Contents>
      </Page>
      <Page orientation="landscape" style={styles.page} size={"A4"}>
        <Contents>
          <Subtitle>4.2 Changes in Emissions Since the Base Year</Subtitle>
          <Image style={styles.chart} src={changesChartSS} />
        </Contents>
      </Page>
      <Page style={styles.page} size={"A4"}>
        <Contents>
          <Subtitle>4.3 Results by Emissions Category</Subtitle>

          <View style={styles.table}>
            <View style={[styles.tableRow, styles.bold, styles.tableHeader]}>
              <Cell style={emissionCategoriesTableStyles.colScope}></Cell>
              <Cell style={emissionCategoriesTableStyles.colCategory}></Cell>
              <Cell style={emissionCategoriesTableStyles.colNotes}></Cell>
              <Cell style={emissionCategoriesTableStyles.coltCO2}>
                {reportBaseYear?.reportingYear}
              </Cell>
              <Cell
                style={emissionCategoriesTableStyles.colPercentageOfTotal}
              ></Cell>
              <Cell style={emissionCategoriesTableStyles.coltCO2}>
                {report?.reportingYear}
              </Cell>
              <Cell
                style={emissionCategoriesTableStyles.colPercentageOfTotal}
              ></Cell>
              <Cell style={emissionCategoriesTableStyles.colChanges}></Cell>
            </View>
            <View style={[styles.tableRow, styles.bold, styles.tableHeader]}>
              <Cell style={emissionCategoriesTableStyles.colScope}>Scope</Cell>
              <Cell style={emissionCategoriesTableStyles.colCategory}>
                Category
              </Cell>
              <Cell style={emissionCategoriesTableStyles.colNotes}>Notes</Cell>
              <Cell
                style={[
                  emissionCategoriesTableStyles.coltCO2,
                  emissionCategoriesTableStyles.colBGCO2BaseYear,
                ]}
              >
                tCO2e (tonne CO2-eq)
              </Cell>
              <Cell
                style={[
                  emissionCategoriesTableStyles.colPercentageOfTotal,
                  emissionCategoriesTableStyles.colBGPercentageOfTotalBaseYear,
                ]}
              >
                % of total
              </Cell>
              <Cell
                style={[
                  emissionCategoriesTableStyles.coltCO2,
                  emissionCategoriesTableStyles.colBGCO2CurrentYear,
                ]}
              >
                tCO2e (tonne CO2-eq)
              </Cell>
              <Cell
                style={[
                  emissionCategoriesTableStyles.colPercentageOfTotal,
                  emissionCategoriesTableStyles.colBGCO2CurrentYear,
                ]}
              >
                % of total
              </Cell>
              <Cell style={emissionCategoriesTableStyles.colChanges}>
                % changes
              </Cell>
            </View>
            {Object.keys(report?.scopeBasedEmissionResults).map((scope) => (
              <React.Fragment key={scope}>
                {report?.scopeBasedEmissionResults[scope].categories.map(
                  (cat) => {
                    let baseTotalCO2eEmissions =
                      reportBaseYear.scopeBasedEmissionResults[
                        scope
                      ].categories.find(
                        (byrCat) => byrCat.category === cat.category
                      )?.totalCO2eEmissions;
                    let currentTotalCO2eEmissions = cat.totalCO2eEmissions;
                    let basePercentageCO2eOfTotal =
                      reportBaseYear.scopeBasedEmissionResults[
                        scope
                      ].categories.find(
                        (byrCat) => byrCat.category === cat.category
                      )?.percentageCO2eOfTotal;
                    let currentPercentageCO2eOfTotal =
                      cat.percentageCO2eOfTotal;
                    return (
                      <View
                        key={cat.category}
                        style={[styles.tableRow]}
                        wrap={false}
                      >
                        <Cell style={emissionCategoriesTableStyles.colScope}>
                          {scope}
                        </Cell>
                        <Cell style={emissionCategoriesTableStyles.colCategory}>
                          {cat.category}
                        </Cell>
                        <Cell style={emissionCategoriesTableStyles.colNotes}>
                          -
                        </Cell>
                        <Cell
                          style={[
                            emissionCategoriesTableStyles.coltCO2,
                            emissionCategoriesTableStyles.colBGCO2BaseYear,
                          ]}
                        >
                          {parseFloat(baseTotalCO2eEmissions).toFixed(2)}
                        </Cell>
                        <Cell
                          style={[
                            emissionCategoriesTableStyles.colPercentageOfTotal,
                            emissionCategoriesTableStyles.colBGPercentageOfTotalBaseYear,
                          ]}
                        >
                          {parseFloat(basePercentageCO2eOfTotal).toFixed(2)}
                        </Cell>
                        <Cell
                          style={[
                            emissionCategoriesTableStyles.coltCO2,
                            emissionCategoriesTableStyles.colBGCO2CurrentYear,
                          ]}
                        >
                          {parseFloat(currentTotalCO2eEmissions).toFixed(2)}
                        </Cell>
                        <Cell
                          style={[
                            emissionCategoriesTableStyles.colPercentageOfTotal,
                            emissionCategoriesTableStyles.colBGPercentageOfTotalCurrentYear,
                          ]}
                        >
                          {parseFloat(currentPercentageCO2eOfTotal).toFixed(2)}
                        </Cell>
                        <Cell
                          style={[
                            emissionCategoriesTableStyles.colChanges,
                            traceNumericChanges(
                              baseTotalCO2eEmissions,
                              currentTotalCO2eEmissions
                            ).number > 0
                              ? emissionCategoriesTableStyles.colBGResultDanger
                              : emissionCategoriesTableStyles.colBGResultSuccess,
                          ]}
                        >
                          {
                            traceNumericChanges(
                              baseTotalCO2eEmissions,
                              currentTotalCO2eEmissions
                            ).string
                          }
                        </Cell>
                      </View>
                    );
                  }
                )}
                {scope === CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_3 && (
                  <View
                    style={[
                      styles.tableRow,
                      emissionCategoriesTableStyles.rowResult,
                    ]}
                    wrap={false}
                  >
                    <Cell style={emissionCategoriesTableStyles.colScope}>
                      Total (FERA)
                    </Cell>
                    <Cell style={emissionCategoriesTableStyles.colCategory}>
                      Fuel and Energy Related Activities
                    </Cell>
                    <Cell style={emissionCategoriesTableStyles.colNotes}>
                      -
                    </Cell>
                    <Cell
                      style={[
                        emissionCategoriesTableStyles.coltCO2,
                        emissionCategoriesTableStyles.colBGResult,
                      ]}
                    >
                      {parseFloat(
                        reportBaseYear?.totalFuelAndEnergyAcitivites
                      ).toFixed(2)}
                    </Cell>
                    <Cell
                      style={[
                        emissionCategoriesTableStyles.colPercentageOfTotal,
                        emissionCategoriesTableStyles.colBGResult,
                      ]}
                    >
                      -
                    </Cell>
                    <Cell
                      style={[
                        emissionCategoriesTableStyles.coltCO2,
                        emissionCategoriesTableStyles.colBGResult,
                      ]}
                    >
                      {parseFloat(report?.totalFuelAndEnergyAcitivites).toFixed(
                        2
                      )}
                    </Cell>
                    <Cell
                      style={[
                        emissionCategoriesTableStyles.colPercentageOfTotal,
                        emissionCategoriesTableStyles.colBGResult,
                      ]}
                    >
                      -
                    </Cell>
                    <Cell
                      style={[
                        emissionCategoriesTableStyles.colChanges,
                        traceNumericChanges(
                          reportBaseYear?.totalFuelAndEnergyAcitivites,
                          report?.totalFuelAndEnergyAcitivites
                        ).number > 0
                          ? emissionCategoriesTableStyles.colBGResultDanger
                          : emissionCategoriesTableStyles.colBGResultSuccess,
                      ]}
                    >
                      {
                        traceNumericChanges(
                          reportBaseYear?.totalFuelAndEnergyAcitivites,
                          report?.totalFuelAndEnergyAcitivites
                        ).string
                      }
                    </Cell>
                  </View>
                )}
                <View
                  style={[
                    styles.tableRow,
                    emissionCategoriesTableStyles.rowResult,
                  ]}
                  wrap={false}
                >
                  <Cell style={emissionCategoriesTableStyles.colScope}>
                    Total
                  </Cell>
                  <Cell style={emissionCategoriesTableStyles.colCategory}>
                    {scope}
                  </Cell>
                  <Cell style={emissionCategoriesTableStyles.colNotes}>-</Cell>
                  <Cell
                    style={[
                      emissionCategoriesTableStyles.coltCO2,
                      emissionCategoriesTableStyles.colBGResult,
                    ]}
                  >
                    {parseFloat(
                      reportBaseYear?.scopeBasedEmissionResults[scope]
                        .grandTotalCO2eEmissions
                    ).toFixed(2)}
                  </Cell>
                  <Cell
                    style={[
                      emissionCategoriesTableStyles.colPercentageOfTotal,
                      emissionCategoriesTableStyles.colBGResult,
                    ]}
                  >
                    {parseFloat(
                      reportBaseYear?.scopeBasedEmissionResults[scope]
                        .grandPercentageCO2eOfTotal
                    ).toFixed(2)}
                  </Cell>
                  <Cell
                    style={[
                      emissionCategoriesTableStyles.coltCO2,
                      emissionCategoriesTableStyles.colBGResult,
                    ]}
                  >
                    {parseFloat(
                      report?.scopeBasedEmissionResults[scope]
                        .grandTotalCO2eEmissions
                    ).toFixed(2)}
                  </Cell>
                  <Cell
                    style={[
                      emissionCategoriesTableStyles.colPercentageOfTotal,
                      emissionCategoriesTableStyles.colBGResult,
                    ]}
                  >
                    {parseFloat(
                      report?.scopeBasedEmissionResults[scope]
                        .grandPercentageCO2eOfTotal
                    ).toFixed(2)}
                  </Cell>
                  <Cell
                    style={[
                      emissionCategoriesTableStyles.colChanges,

                      traceNumericChanges(
                        reportBaseYear?.scopeBasedEmissionResults[scope]
                          .grandTotalCO2eEmissions,
                        report?.scopeBasedEmissionResults[scope]
                          .grandTotalCO2eEmissions
                      ).number > 0
                        ? emissionCategoriesTableStyles.colBGResultDanger
                        : emissionCategoriesTableStyles.colBGResultSuccess,
                    ]}
                  >
                    {
                      traceNumericChanges(
                        reportBaseYear?.scopeBasedEmissionResults[scope]
                          .grandTotalCO2eEmissions,
                        report?.scopeBasedEmissionResults[scope]
                          .grandTotalCO2eEmissions
                      ).string
                    }
                  </Cell>
                </View>
              </React.Fragment>
            ))}
            <View style={[styles.tableRow]} wrap={false}>
              <Cell style={emissionCategoriesTableStyles.colScope}>
                Total results
              </Cell>
              <Cell style={emissionCategoriesTableStyles.colCategory}>
                Scope 1, 2 & 3
              </Cell>
              <Cell style={emissionCategoriesTableStyles.colNotes}>-</Cell>
              <Cell
                style={[
                  emissionCategoriesTableStyles.coltCO2,
                  emissionCategoriesTableStyles.colBGCO2BaseYear,
                ]}
              >
                {parseFloat(
                  reportBaseYear?.scopeBasedEmissionSummary
                    .grandTotalCO2eEmissions
                ).toFixed(2)}
              </Cell>
              <Cell
                style={[
                  emissionCategoriesTableStyles.colPercentageOfTotal,
                  emissionCategoriesTableStyles.colBGCO2BaseYear,
                ]}
              >
                {parseFloat(
                  reportBaseYear?.scopeBasedEmissionSummary
                    .grandPercentageCO2eOfTotal
                ).toFixed(2)}
              </Cell>
              <Cell
                style={[
                  emissionCategoriesTableStyles.coltCO2,
                  emissionCategoriesTableStyles.colBGCO2CurrentYear,
                ]}
              >
                {parseFloat(
                  report?.scopeBasedEmissionSummary.grandTotalCO2eEmissions
                ).toFixed(2)}
              </Cell>
              <Cell
                style={[
                  emissionCategoriesTableStyles.colPercentageOfTotal,
                  emissionCategoriesTableStyles.colBGPercentageOfTotalCurrentYear,
                ]}
              >
                {parseFloat(
                  report?.scopeBasedEmissionSummary.grandPercentageCO2eOfTotal
                ).toFixed(2)}
              </Cell>
              <Cell
                style={[
                  emissionCategoriesTableStyles.colChanges,
                  traceNumericChanges(
                    reportBaseYear?.scopeBasedEmissionSummary
                      .grandTotalCO2eEmissions,
                    report?.scopeBasedEmissionSummary.grandTotalCO2eEmissions
                  ).number > 0
                    ? emissionCategoriesTableStyles.colBGResultDanger
                    : emissionCategoriesTableStyles.colBGResultSuccess,
                ]}
              >
                {
                  traceNumericChanges(
                    reportBaseYear?.scopeBasedEmissionSummary
                      .grandTotalCO2eEmissions,
                    report?.scopeBasedEmissionSummary.grandTotalCO2eEmissions
                  ).string
                }
              </Cell>
            </View>

            <View style={[styles.tableRow]} wrap={false}>
              <Cell style={emissionCategoriesTableStyles.colScope}>
                Out of Scope
              </Cell>
              <Cell style={emissionCategoriesTableStyles.colCategory}>
                {report?.outOfScopeEmissionResults?._id}
              </Cell>
              <Cell style={emissionCategoriesTableStyles.colNotes}>-</Cell>
              <Cell
                style={[
                  emissionCategoriesTableStyles.coltCO2,
                  emissionCategoriesTableStyles.colBGOutOfScopeBaseYear,
                ]}
              >
                {parseFloat(
                  reportBaseYear?.outOfScopeEmissionResults
                    .totalGhgBiogenicCo2Emission
                ).toFixed(2)}
              </Cell>
              <Cell style={emissionCategoriesTableStyles.colPercentageOfTotal}>
                -
              </Cell>
              <Cell
                style={[
                  emissionCategoriesTableStyles.coltCO2,
                  emissionCategoriesTableStyles.colBGOutOfScopeCurrentYear,
                ]}
              >
                {parseFloat(
                  report?.outOfScopeEmissionResults.totalGhgBiogenicCo2Emission
                )}
              </Cell>
              <Cell style={emissionCategoriesTableStyles.colPercentageOfTotal}>
                -
              </Cell>
              <Cell
                style={[
                  emissionCategoriesTableStyles.colChanges,
                  traceNumericChanges(
                    reportBaseYear?.outOfScopeEmissionResults
                      .totalGhgBiogenicCo2Emission,
                    report?.outOfScopeEmissionResults
                      .totalGhgBiogenicCo2Emission
                  ).number > 0
                    ? emissionCategoriesTableStyles.colBGResultDanger
                    : emissionCategoriesTableStyles.colBGResultSuccess,
                ]}
              >
                {
                  traceNumericChanges(
                    reportBaseYear?.outOfScopeEmissionResults
                      .totalGhgBiogenicCo2Emission,
                    report?.outOfScopeEmissionResults
                      .totalGhgBiogenicCo2Emission
                  ).string
                }
              </Cell>
            </View>

            <View style={[styles.tableRow]} wrap={false}>
              <Cell style={emissionCategoriesTableStyles.colScope}>
                Intensity Ratio
              </Cell>
              <Cell style={emissionCategoriesTableStyles.colCategory}>
                tCO2e/1£m of turnover
              </Cell>
              <Cell style={emissionCategoriesTableStyles.colNotes}>-</Cell>
              <Cell
                style={[
                  emissionCategoriesTableStyles.coltCO2,
                  emissionCategoriesTableStyles.colBGOutOfScopeBaseYear,
                ]}
              >
                {parseFloat(
                  reportBaseYear?.intensityRatio.totalCO2ePerMillionOfTurnOver
                ).toFixed(2)}
              </Cell>
              <Cell style={emissionCategoriesTableStyles.colPercentageOfTotal}>
                -
              </Cell>
              <Cell
                style={[
                  emissionCategoriesTableStyles.coltCO2,
                  emissionCategoriesTableStyles.colBGOutOfScopeCurrentYear,
                ]}
              >
                {parseFloat(
                  report?.intensityRatio.totalCO2ePerMillionOfTurnOver
                ).toFixed(2)}
              </Cell>
              <Cell style={emissionCategoriesTableStyles.colPercentageOfTotal}>
                -
              </Cell>
              <Cell
                style={[
                  emissionCategoriesTableStyles.colChanges,

                  traceNumericChanges(
                    reportBaseYear?.intensityRatio
                      .totalCO2ePerMillionOfTurnOver,
                    report?.intensityRatio.totalCO2ePerMillionOfTurnOver
                  ).number > 0
                    ? emissionCategoriesTableStyles.colBGResultDanger
                    : emissionCategoriesTableStyles.colBGResultSuccess,
                ]}
              >
                {
                  traceNumericChanges(
                    reportBaseYear?.intensityRatio
                      .totalCO2ePerMillionOfTurnOver,
                    report?.intensityRatio.totalCO2ePerMillionOfTurnOver
                  ).string
                }
              </Cell>
            </View>
            <View style={[styles.tableRow]} wrap={false}>
              <Cell style={emissionCategoriesTableStyles.colScope}>
                Intensity Ratio
              </Cell>
              <Cell style={emissionCategoriesTableStyles.colCategory}>
                tCO2e/employee
              </Cell>
              <Cell style={emissionCategoriesTableStyles.colNotes}>-</Cell>
              <Cell
                style={[
                  emissionCategoriesTableStyles.coltCO2,
                  emissionCategoriesTableStyles.colBGOutOfScopeBaseYear,
                ]}
              >
                {parseFloat(
                  reportBaseYear?.intensityRatio.totalCO2ePerEmployee
                ).toFixed(2)}
              </Cell>
              <Cell style={emissionCategoriesTableStyles.colPercentageOfTotal}>
                -
              </Cell>
              <Cell
                style={[
                  emissionCategoriesTableStyles.coltCO2,
                  emissionCategoriesTableStyles.colBGOutOfScopeCurrentYear,
                ]}
              >
                {parseFloat(
                  report?.intensityRatio.totalCO2ePerEmployee
                ).toFixed(2)}
              </Cell>
              <Cell style={emissionCategoriesTableStyles.colPercentageOfTotal}>
                -
              </Cell>
              <Cell
                style={[
                  emissionCategoriesTableStyles.colChanges,
                  traceNumericChanges(
                    reportBaseYear?.intensityRatio.totalCO2ePerEmployee,
                    report?.intensityRatio.totalCO2ePerEmployee
                  ).number > 0
                    ? emissionCategoriesTableStyles.colBGResultDanger
                    : emissionCategoriesTableStyles.colBGResultSuccess,
                ]}
              >
                {
                  traceNumericChanges(
                    reportBaseYear?.intensityRatio.totalCO2ePerEmployee,
                    report?.intensityRatio.totalCO2ePerEmployee
                  ).string
                }
              </Cell>
            </View>
          </View>

          <Subtitle>4.4 Data and Emission Factors</Subtitle>
          <Article>
            Our activity data was gathered from internal records and external
            suppliers. Emission factors were obtained from reliable secondary
            databases, including those published annually by DEFRA/BEIS/DESNZ.
            BOM Systems Ltd has independently verified custom emission factors.
            Any changes to published emission factors or updates to data sources
            have been documented and explained in the Annex.
          </Article>

          <Subtitle>4.5 Uncertainties and Accuracy Impacts</Subtitle>
          <Article>
            For each emission source, the activity data quality and the
            corresponding emission factor were rated on a scale ranging from
            Very Good Data Quality (4) to Basic Data Quality (1). By calculating
            the weighted average of these grades, we determined the overall
            quality of each emissions category for each reporting year. The
            details of the data quality categories are in the Annex.
          </Article>

          <Subtitle>4.6 Actions for Reducing Uncertainty</Subtitle>
          <Article>
            We are committed to continuously improving our reporting of GHG
            emissions to ensure comprehensive and transparent disclosure. To
            reduce uncertainty in our future greenhouse gas (GHG) inventories,
            we plan to enhance our data collection and monitoring systems to
            ensure that our reporting is more granular and consistent. We also
            want to focus on developing custom emission factors where feasible.
          </Article>
        </Contents>
      </Page>
      <Page style={styles.page} size={"A4"}>
        <Contents>
          <Title>5. Annex - Methodology and Supporting Information</Title>

          <Subtitle>5.1 Quantification Model and Methodology</Subtitle>
          <Article>
            This report used the <Bold>{brandConfig?.brandName}</Bold>, an
            online tool developed and managed by{" "}
            <Link href="https://www.imssystems.tech">iMS Technologies</Link>, as
            the model and tool for estimating GHG emissions. The methodology and
            approach comply with the GHG Protocol Corporate Accounting and
            Reporting Standard, The GHG Protocol Corporate Value Chain (Scope 3)
            Standard, and ISO 14064-1:2018.
          </Article>
          <Article>
            The calculator performed the GHG assessment based on activity data
            from our records, which was multiplied by externally published
            emission factors from reputable public sources, primarily the
            Department for Environment, Food & Rural Affairs (DEFRA) /BEIS.
          </Article>
          <Text
            style={{
              textAlign: "center",
              fontSize: 14,
              fontFamily: "Times-Bold",
              marginVertical: 20,
            }}
          >
            Activity Data x GHG Emission Factor = Total Emissions
          </Text>
          <Article>
            The Kyoto Protocol GHGs were calculated separately where appropriate
            and then converted and quantified as tonnes of carbon dioxide
            equivalent (tCO2e) to calculate their Global Warming Potential
            (GWP), expressed relative to the GWP of one unit of carbon dioxide.
            The GWPs used in our calculations are from the Intergovernmental
            Panel on Climate Change (IPCC) 'IPCC Global Warming Potential Values
            v 2.0 August 2024', using the AR6 values.
          </Article>

          <Article>
            Secondary emission factors related to volume, mass, and distances
            were obtained from the UK Government's Department for Environment,
            Food & Rural Affairs (DEFRA), the Department for Business and Energy
            Strategy (BEIS and the Department for Energy Security and Net Zero
            (DESNZ) Conversion Factors databases.
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
            standards such as boundary definitions, compliance, and completeness
            must be met. We require these to have been independently verified.
            They are otherwise based on published, verified information, such as
            publicly available energy tariffs. All custom factors we use meet
            the data quality requirements specified in the GHG Protocol
            Corporate Value Chain (Scope 3) Accounting and Reporting Standard.
          </Article>
          <Alert color="warning" className="border border-warning">
            The justification for this approach is that the{" "}
            <Bold> {brandConfig?.brandName}</Bold>
            has been verified against ISO 14064-1 by a UKAS-accredited
            Verification Body (Interface NRM Ltd) and, as such, complies with
            the Greenhouse Gas (GHG) Protocol and ensures emissions are
            accurately represented according to widely recognised standards and
            methodologies. The calculator is an online tool that ensures that it
            can be controlled and updated effectively and that all the emissions
            factors are locked to prevent calculation errors. This approach
            ensures that the results can be consistently reproduced.
          </Alert>

          <Subtitle>5.2 Base Year</Subtitle>
          <Article>
            Our base year shows changes in our emissions over time, allowing us
            to conduct comparative analyses in tracking and reporting GHG
            emissions and develop meaningful and consistent comparisons of
            emissions over time.
          </Article>
          <Article>
            Our base year was selected because it is representative and provides
            an accurate reference point for our operations, data availability,
            and organisational structure. It was the first year we recorded our
            emissions in sufficient detail to give a reliable emissions figure,
            and it avoids unusual trading years (such as those around COVID-19
            or unusual corporate activity).
          </Article>
          <Article>
            To consistently track our emissions over time, we shall recalculate
            base year emissions{" "}
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
            <Bold>Changes in the categories</Bold> or activities included in the
            Scope 3 inventory.
          </Article>
          <Article>
            Our policy defines a significant change as altering base year
            emissions by ten per cent or greater. As part of the base year
            emissions recalculation policy, we will establish and disclose this
            significance threshold that triggers base year emissions
            recalculations.
          </Article>

          <Article>
            If a recalculation is necessary, we will accurately recalculate the
            base year emissions using the same approach applied in the current
            reporting year, taking into account the identified changes or
            errors, and ensure consistency with the current reporting year. We
            will document the reasons for the recalculation, the steps taken,
            and the impact on the base year emissions data and update the GHG
            inventory.
          </Article>

          <Subtitle>5.3 Biogenic Emissions</Subtitle>
          <Article>
            Biogenic Emissions have been calculated and reported per Annex D of
            the ISO 14064-1 standard.
          </Article>
          <Subtitle>5.4 Treatment of Electricity</Subtitle>
          <Article>
            Electricity is treated according to Annex E of the ISO 14064-1
            standard. Our GHG assessment utilises both location-based and
            market-based reporting methods.{" "}
            <Link href="#iso-14064-full-report-ref-1">[1]</Link> This dual
            approach comprehensively explains our electricity-related GHG
            emissions. We ensure that the quality criteria of Annex E of ISO
            14064-1 are met for our market-based reporting.
          </Article>
        </Contents>
      </Page>
      <Page style={styles.page} size={"A4"}>
        <Contents>
          <Title>6. Data Quality and Uncertainty</Title>
          <Article>
            The approach to data quality for this report is that the activity
            data were entered into the {brandConfig.brandName} using the
            qualification table shown below, with a qualitative data assessment,
            which uses the approach defined within the GHG Corporate Value Chain
            (Scope 3) Accounting and Reporting Standard (see Box 7.2).
          </Article>

          <View style={styles.table}>
            <View style={[styles.tableRow, styles.bold, styles.tableHeader]}>
              <Cell style={dataQualityDefTableStyles.colADGrade}>
                Activity Data Grade
              </Cell>
              <Cell style={dataQualityDefTableStyles.colADCritatia}>
                Activity Data Criteria
              </Cell>
            </View>
            {Object.values(CC_CONSTANTS.CC_DATA_QUALITY_INFORMATION).map(
              (data) => {
                return (
                  <View
                    key={data.DEFINITION}
                    style={[styles.tableRow]}
                    wrap={false}
                  >
                    <Cell
                      style={[
                        dataQualityDefTableStyles.colADGrade,
                        data.DEFINITION ===
                        CC_CONSTANTS.CC_DATA_QUALITY_GRADES.VERY_GOOD
                          ? dataQualityDefTableStyles.colBGVGDQ
                          : data.DEFINITION ===
                            CC_CONSTANTS.CC_DATA_QUALITY_GRADES.GOOD
                          ? dataQualityDefTableStyles.colBGGDQ
                          : data.DEFINITION ===
                            CC_CONSTANTS.CC_DATA_QUALITY_GRADES.FAIR
                          ? dataQualityDefTableStyles.colBGFDQ
                          : dataQualityDefTableStyles.colBGPDQ,
                      ]}
                    >
                      {data.DEFINITION}
                    </Cell>
                    <Cell style={dataQualityDefTableStyles.colADCritatia}>
                      {data.ACTIVITY_DATA_CRITERIA}
                    </Cell>
                  </View>
                );
              }
            )}
          </View>

          <Subtitle>6.1 Data Quality Full Results</Subtitle>

          <View style={styles.table}>
            <View style={[styles.tableRow, styles.bold, styles.tableHeader]}>
              <Cell style={dateQualityResultsTableStyles.colScope}>Scope</Cell>
              <Cell style={dateQualityResultsTableStyles.colCategory}>
                Category
              </Cell>
              <Cell style={dateQualityResultsTableStyles.colNotes}>Notes</Cell>
              <Cell
                style={[
                  styles.tableCellBGOrangeLighter,
                  dateQualityResultsTableStyles.coltCO2,
                ]}
              >
                tCO2e (tonne CO2e)
              </Cell>
              <Cell style={dateQualityResultsTableStyles.colADGradeScore}>
                Activity Data Weighted Quality Score
              </Cell>
              <Cell style={dateQualityResultsTableStyles.colADGrade}>
                Activity Data Quality Grade
              </Cell>
              <Cell style={dateQualityResultsTableStyles.colEFGradeScore}>
                Emission Factor Weighted Quality Score
              </Cell>
              <Cell style={dateQualityResultsTableStyles.colEFGrade}>
                Emission Factor Quality Grade
              </Cell>
            </View>
            {Object.keys(report?.scopeBasedEmissionResults).map((scope) => {
              return (
                <React.Fragment key={scope}>
                  {report?.scopeBasedEmissionResults[scope].categories.map(
                    (cat) => {
                      return (
                        <View
                          key={cat.category}
                          style={[styles.tableRow]}
                          wrap={false}
                        >
                          <Cell style={dateQualityResultsTableStyles.colScope}>
                            {scope}
                          </Cell>
                          <Cell
                            style={dateQualityResultsTableStyles.colCategory}
                          >
                            {cat.category}
                          </Cell>
                          <Cell style={dateQualityResultsTableStyles.colNotes}>
                            -
                          </Cell>
                          <Cell
                            style={[
                              styles.tableCellBGOrangeLighter,
                              dateQualityResultsTableStyles.coltCO2,
                            ]}
                          >
                            {parseFloat(cat.totalCO2eEmissions).toFixed(2)}
                          </Cell>
                          <Cell
                            style={
                              dateQualityResultsTableStyles.colADGradeScore
                            }
                          >
                            {cat.adGradeScore}
                          </Cell>
                          <Cell
                            style={dateQualityResultsTableStyles.colADGrade}
                          >
                            {cat.adGrade}
                          </Cell>
                          <Cell
                            style={
                              dateQualityResultsTableStyles.colEFGradeScore
                            }
                          >
                            {cat.efGradeScore}
                          </Cell>
                          <Cell
                            style={dateQualityResultsTableStyles.colEFGrade}
                          >
                            {cat.efGrade}
                          </Cell>
                        </View>
                      );
                    }
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </Contents>
      </Page>
      <Page style={styles.page} size={"A4"}>
        <Contents>
          <Title>
            7. GHG Breakdown of Direct Emissions for {reportingYear}
          </Title>
          <Article>
            ISO14064-1 requires reporting organisations to report Direct
            emissions (Scope 1) separated by individual GHG gasses. These gasses
            are presented in tonnes of carbon dioxide equivalent (tCO2e).
          </Article>

          <View style={styles.table}>
            <View style={[styles.tableRow, styles.bold, styles.tableHeader]}>
              <Cell style={ghgBreakDownTableStyles.colCategory}>Category</Cell>
              <Cell
                style={[
                  styles.tableCellBGOrangeLighter,
                  ghgBreakDownTableStyles.colGHG,
                ]}
              >
                tCO2e (tonne CO2e)
              </Cell>
              <Cell style={ghgBreakDownTableStyles.colGHG}>
                Carbon Dioxide (CO2)
              </Cell>
              <Cell style={ghgBreakDownTableStyles.colGHG}>Methane (CH4)</Cell>
              <Cell style={ghgBreakDownTableStyles.colGHG}>
                Nitrous Oxide (N2O)
              </Cell>
              <Cell style={ghgBreakDownTableStyles.colGHG}>
                Hydro-flurocarbons (HFCs)
              </Cell>
              <Cell style={ghgBreakDownTableStyles.colGHG}>
                Per-flurocarbons (PFCs)
              </Cell>
              <Cell style={ghgBreakDownTableStyles.colGHG}>
                Sulphur hexaflouride (SF6)
              </Cell>
              <Cell style={ghgBreakDownTableStyles.colGHG}>
                Nitrogen triflouride (NF3)
              </Cell>
            </View>

            {report?.scopeBasedEmissionResults[
              CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_1
            ].categories.map((cat) => {
              return (
                <View style={styles.tableRow} key={cat.category} wrap={false}>
                  <Cell style={ghgBreakDownTableStyles.colCategory}>
                    {cat.category}
                  </Cell>
                  <Cell
                    style={[
                      styles.tableCellBGOrangeLighter,
                      ghgBreakDownTableStyles.colGHG,
                    ]}
                  >
                    {parseFloat(cat.totalCO2eEmissions).toFixed(2)}
                  </Cell>
                  <Cell style={ghgBreakDownTableStyles.colGHG}>
                    {parseFloat(cat.totalCO2Emissions).toFixed(2)}
                  </Cell>
                  <Cell style={ghgBreakDownTableStyles.colGHG}>
                    {parseFloat(cat.totalCH4Emissions).toFixed(2)}
                  </Cell>
                  <Cell style={ghgBreakDownTableStyles.colGHG}>
                    {parseFloat(cat.totalN2OEmissions).toFixed(2)}
                  </Cell>
                  <Cell style={ghgBreakDownTableStyles.colGHG}>
                    {parseFloat(cat.totalHFCEmissions).toFixed(2)}
                  </Cell>
                  <Cell style={ghgBreakDownTableStyles.colGHG}>
                    {parseFloat(cat.totalPFCEmissions).toFixed(2)}
                  </Cell>
                  <Cell style={ghgBreakDownTableStyles.colGHG}>
                    {parseFloat(cat.totalSF6Emissions).toFixed(2)}
                  </Cell>
                  <Cell style={ghgBreakDownTableStyles.colGHG}>
                    {parseFloat(cat.totalNF3Emissions).toFixed(2)}
                  </Cell>
                </View>
              );
            })}
            <View style={styles.tableRow} wrap={false}>
              <Cell style={ghgBreakDownTableStyles.colCategory}>Total</Cell>
              <Cell
                style={[
                  styles.tableCellBGOrangeLight,
                  ghgBreakDownTableStyles.colGHG,
                ]}
              >
                {parseFloat(
                  report?.scopeBasedEmissionResults[
                    CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_1
                  ].grandTotalCO2eEmissions
                ).toFixed(2)}
              </Cell>
              <Cell style={ghgBreakDownTableStyles.colGHG}>0</Cell>
              <Cell style={ghgBreakDownTableStyles.colGHG}>0</Cell>
              <Cell style={ghgBreakDownTableStyles.colGHG}>0</Cell>
              <Cell style={ghgBreakDownTableStyles.colGHG}>0</Cell>
              <Cell style={ghgBreakDownTableStyles.colGHG}>0</Cell>
              <Cell style={ghgBreakDownTableStyles.colGHG}>0</Cell>
              <Cell style={ghgBreakDownTableStyles.colGHG}>0</Cell>
            </View>
          </View>
        </Contents>
      </Page>
      <Page style={styles.page} size={"A4"}>
        <Contents>
          <Title>8. Activity Breakdown for {reportingYear}</Title>
          <Article>
            All activity and emissions data for the <Bold>{reportingYear}</Bold>{" "}
            reporting year.
          </Article>

          {reportingBoundaries.map((b) => {
            return (
              <React.Fragment key={b._id}>
                <ActivitySummaryByCategory
                  category={b.category}
                  relevence={b.relevance}
                  reportingYear={reportingYear}
                  onLoadComplete={markCategorySummaryStatusAsLoaded}
                />
              </React.Fragment>
            );
          })}
        </Contents>
      </Page>
      <Page style={styles.page} size={"A4"}>
        <Contents>
          <Title>9. Emission Reduction Targets</Title>
          <Article>
            The organisation is committed to managing and reducing its emissions
            in accordance with the Programme requirements. Table 8 provides
            details of the emission reduction targets to be implemented. These
            are 'SMART' targets (specific, measurable, achievable, realistic,
            and time-constrained).
          </Article>
          <Article>
            In line with the organisation's commitment to SBTi and Scotland and
            UK Government Targets, we will continue to look for more sustainable
            alternatives to fossil fuels for our vehicles, such as HVO fuel,
            EVs, and Renewable CNG.
          </Article>
          <Article>
            We are currently focused on completing the Anaerobic Digestor plant,
            which would help us completely reduce our Scope 2 emissions and
            contribute to the principles of the circular economy. While the
            construction is ongoing, we will purchase electricity produced using
            renewable energy sources.
          </Article>
          <Article>
            In order to reduce the embodied carbon emissions associated with the
            purchase of structural steel, we will continue to procure lower
            embodied carbon steel.
          </Article>
          <Article>
            GHG per tonne of fabricated steel increased from 76kgCO2e/t in the
            base year 2019-2020 to 120kgCO2e/t in 2023-2024 (Scope 1 & 2 GHG
            emission categories only). This is due to the significant increase
            in Scope 1 emissions associated with diesel purchases for steel
            deliveries.
          </Article>

          <Subtitle>9.1 Emission Reduction Initiatives (Identified)</Subtitle>

          <View style={styles.table}>
            <View style={[styles.tableRow, styles.bold, styles.tableHeader]}>
              <Cell style={initiativeTableStyles.colObjective}>Objective</Cell>
              <Cell style={initiativeTableStyles.colProject}>Project</Cell>
              <Cell style={initiativeTableStyles.colCompletion}>
                Completion Date
              </Cell>
              <Cell style={initiativeTableStyles.colBenefits}>
                Potential co-benefits
              </Cell>
              <Cell style={initiativeTableStyles.colUnintended}>
                Potential unintended consequences
              </Cell>
            </View>
            {(!initiativesIdentified || initiativesIdentified.length === 0) && (
              <View style={[styles.tableRow]} wrap={false}>
                <Cell style={styles.tabelColEmptyRow}>No data available</Cell>
              </View>
            )}
            {initiativesIdentified?.map((it) => {
              const formatDate = (d) => {
                if (!d) return "Not implemented";
                try {
                  const dt = new Date(d);
                  const dd = String(dt.getDate()).padStart(2, "0");
                  const mm = String(dt.getMonth() + 1).padStart(2, "0");
                  const yyyy = dt.getFullYear();
                  return `${dd}/${mm}/${yyyy}`;
                } catch (_) {
                  return "Not implemented";
                }
              };
              return (
                <View key={it?._id} style={[styles.tableRow]} wrap={false}>
                  <Cell style={initiativeTableStyles.colObjective}>
                    {it?.title || ""}
                  </Cell>
                  <Cell style={initiativeTableStyles.colProject}>
                    {draftjsToText(it?.description || "")}
                  </Cell>
                  <Cell style={initiativeTableStyles.colCompletion}>
                    {formatDate(it?.implementedAt)}
                  </Cell>
                  <Cell style={initiativeTableStyles.colBenefits}>
                    {draftjsToText(it?.potentialCoBenefits || "n/a")}
                  </Cell>
                  <Cell style={initiativeTableStyles.colUnintended}>
                    {draftjsToText(
                      it?.potentialUnintendedConsequences || "n/a"
                    )}
                  </Cell>
                </View>
              );
            })}
          </View>

          <Subtitle>Emission Reduction Initiatives (Implemented)</Subtitle>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.bold, styles.tableHeader]}>
              <Cell style={initiativeTableStyles.colObjective}>Objective</Cell>
              <Cell style={initiativeTableStyles.colProject}>Project</Cell>
              <Cell style={initiativeTableStyles.colCompletion}>
                Completion Date
              </Cell>
              <Cell style={initiativeTableStyles.colBenefits}>
                Potential co-benefits
              </Cell>
              <Cell style={initiativeTableStyles.colUnintended}>
                Potential unintended consequences
              </Cell>
            </View>
            {(!initiativesImplemented ||
              initiativesImplemented.length === 0) && (
              <View style={[styles.tableRow]} wrap={false}>
                <Cell style={styles.tabelColEmptyRow}>No data available</Cell>
              </View>
            )}
            {initiativesImplemented?.map((it) => {
              const formatDate = (d) => {
                if (!d) return "Not implemented";
                try {
                  const dt = new Date(d);
                  const dd = String(dt.getDate()).padStart(2, "0");
                  const mm = String(dt.getMonth() + 1).padStart(2, "0");
                  const yyyy = dt.getFullYear();
                  return `${dd}/${mm}/${yyyy}`;
                } catch (_) {
                  return "Not implemented";
                }
              };
              return (
                <View key={it?._id} style={[styles.tableRow]} wrap={false}>
                  <Cell style={initiativeTableStyles.colObjective}>
                    {it?.title || ""}
                  </Cell>
                  <Cell style={initiativeTableStyles.colProject}>
                    {draftjsToText(it?.description || "")}
                  </Cell>
                  <Cell style={initiativeTableStyles.colCompletion}>
                    {formatDate(it?.implementedAt)}
                  </Cell>
                  <Cell style={initiativeTableStyles.colBenefits}>
                    {draftjsToText(it?.potentialCoBenefits || "n/a")}
                  </Cell>
                  <Cell style={initiativeTableStyles.colUnintended}>
                    {draftjsToText(
                      it?.potentialUnintendedConsequences || "n/a"
                    )}
                  </Cell>
                </View>
              );
            })}
          </View>

          <Subtitle>References</Subtitle>
          <Text id="iso-14064-full-report-ref-1" style={styles.references}>
            1. Location-based reporting calculates Scope 2 emissions based on
            the average emissions intensity of the grid where electricity is
            consumed, using emission factors specific to the geographical
            region, regardless of the source. This is straightforward to
            calculate, but the origin of the electricity (renewable or fossil
            fuel) is not considered.{" "}
          </Text>
          <Text id="iso-14064-full-report-ref-2" style={styles.references}>
            2. Market-based reporting considers the specific energy purchased,
            including Renewable Energy Certificates (RECs), etc., to offset
            emissions. It allows accounting efforts to support cleaner energy
            sources and reduce the carbon footprint associated with purchased
            energy.
          </Text>

          {includeSignature && signatureUrl && (
            <View style={signatureStyles.signatureContainer}>
              <Image
                style={signatureStyles.signatureImage}
                src={signatureUrl}
              />
              <Text style={signatureStyles.signatureName}>
                {signatureName || "Digital Signature"}
              </Text>
              <Text style={signatureStyles.signatureOrg}>
                {organisation?.name || "Organisation Name"}
              </Text>
            </View>
          )}
        </Contents>
      </Page>
    </Document>
  );
  return (
    <PDFViewer height={1200} width={"100%"}>
      {pdfreport}
    </PDFViewer>
  );
  return (
    <PDFDownloadLink document={pdfreport} fileName="somename.pdf">
      {({ blob, url, loading, error }) =>
        loading ? "Loading document..." : "Download now!"
      }
    </PDFDownloadLink>
  );
};

const LoadnigOverLay = ({ children }) => {
  return (
    <div className="position-absolute h-100 w-100 top-1 bg-primary-light opacity-75 d-flex justify-content-center align-items-center flex-column">
      {children}
    </div>
  );
};

const PDF = () => {
  const reportingYearEmissionChartRef = useRef(null);
  const changesEmissionChartRef = useRef(null);
  const [reportingYearChartSS, takeReportingYearChartSS] = useScreenshot();
  const [changesChartSS, takeChangesChartSS] = useScreenshot();
  const { parameter, reportingPeriods, isParameterLoading } = useParameters();
  const { organisation } = useOrganisation();
  const { currentUserData } = useApplication();
  const {
    report,
    reportBaseYear,
    selectedReportingYear,
    selectReportingYear,
    isReportLoading,
    initiativesIdentified,
    initiativesImplemented,
  } = useISO14064FullReport();
  const { signatureUrl } = useSignature(currentUserData?._id);
  const [pdfPrepared, setPdfPrepared] = useState(false);
  const [includeSignature, setIncludeSignature] = useState(false);
  useEffect(() => {
    setTimeout(() => {
      if (
        reportingYearEmissionChartRef.current &&
        changesEmissionChartRef.current
      ) {
        takeReportingYearChartSS(reportingYearEmissionChartRef.current);
        takeChangesChartSS(changesEmissionChartRef.current);
      }
    }, 500);
  }, [isReportLoading]);
  if (!selectedReportingYear?.year)
    return (
      <div className="py-5">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <div className="text-center mb-4">
                  <h4 className="mb-2">Generate PDF Report</h4>
                  <p className=" mb-4">
                    Select a reporting year and configure your PDF options
                  </p>
                </div>

                {/* Signature Options */}
                <div className="border-bottom pb-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <label className="form-label mb-1">
                        Digital Signature
                      </label>
                      <div className=" small">
                        {!signatureUrl
                          ? "No signature available"
                          : includeSignature
                          ? "Signature will be included"
                          : "Signature disabled"}
                      </div>
                    </div>
                    <FormGroup switch className="mb-0">
                      <Input
                        type="switch"
                        role="switch"
                        id="includeSignatureYearSelection"
                        checked={includeSignature}
                        onChange={(e) => setIncludeSignature(e.target.checked)}
                        disabled={!signatureUrl}
                      />
                      <Label
                        check
                        for="includeSignatureYearSelection"
                        className="mb-0"
                      >
                        Include Signature
                      </Label>
                    </FormGroup>
                  </div>
                </div>

                {/* Reporting Year Selection */}
                <div className="mt-3">
                  <label className="form-label mb-1">Reporting Year</label>
                  <UncontrolledDropdown className="w-100">
                    <DropdownToggle className="btn btn-outline-secondary w-100 d-flex justify-content-between align-items-center">
                      <span>
                        {selectedReportingYear?.year || "Select reporting year"}
                      </span>
                      <PiCaretUpDownBold />
                    </DropdownToggle>
                    <DropdownMenu className="w-100">
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
                  </UncontrolledDropdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  if (isParameterLoading || isReportLoading) return null;
  if (!reportingYearChartSS || !changesChartSS)
    return (
      <div className="position-relative">
        <div ref={reportingYearEmissionChartRef}>
          <SYRCategoryEmissionChart />
        </div>
        <div ref={changesEmissionChartRef}>
          <CategoryEmissionCompareChart />
        </div>
        <LoadnigOverLay>Making charts for you repot...</LoadnigOverLay>
      </div>
    );
  return (
    <div className="position-relative">
      {signatureUrl && (
        <div className="mb-3 p-3 bg-light rounded d-flex align-items-center justify-content-between">
          <div>
            <span className="fw-medium">Digital Signature</span>
            <div className="text-muted small">
              {!signatureUrl
                ? "No signature available"
                : includeSignature
                ? "Signature enabled"
                : "Signature disabled"}
            </div>
          </div>
          <FormGroup switch className="mb-0">
            <Input
              type="switch"
              role="switch"
              id="includeSignatureMain"
              checked={includeSignature}
              onChange={(e) => setIncludeSignature(e.target.checked)}
              disabled={!signatureUrl}
            />
            <Label check for="includeSignatureMain" className="mb-0">
              Include Signature
            </Label>
          </FormGroup>
        </div>
      )}

      <MakePDF
        report={report}
        reportBaseYear={reportBaseYear}
        organisation={organisation}
        reportingYear={selectedReportingYear?.year}
        reportingStartDate={selectedReportingYear?.startDate}
        reportingEndDate={selectedReportingYear?.endDate}
        reportingYearChartSS={reportingYearChartSS}
        reportingBoundaries={parameter.reportingBoundaries}
        changesChartSS={changesChartSS}
        initiativesIdentified={initiativesIdentified}
        initiativesImplemented={initiativesImplemented}
        includeSignature={includeSignature}
        signatureUrl={signatureUrl}
        signatureName={currentUserData?.name || "Digital Signature"}
        onPdfLoaded={() => {
          setPdfPrepared(true);
        }}
      />
      {!pdfPrepared && (
        <LoadnigOverLay>
          <h2>Preparing contents for your report...</h2>
          <p>Please hold tight this may take a few secondas</p>
        </LoadnigOverLay>
      )}
    </div>
  );
};

export default PDF;
