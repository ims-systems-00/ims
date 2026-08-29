import {
  Card,
  CardBody,
  CardHeader,
  Col,
  InputGroup,
  InputGroupText,
  Row,
  Select,
  Table,
} from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { FaChartPie } from "react-icons/fa";
import { FaLeaf, FaTruckPlane } from "react-icons/fa6";
import { ImFire } from "react-icons/im";
import { LuCloudCog, LuFootprints } from "react-icons/lu";
import { MdOutlineElectricalServices } from "react-icons/md";
import CategoryIcon from "../../components/CategoryIcon";
import { GasInChemicalFormat } from "../../components/GasInChemicalFormat";
import Loading from "../../components/Loading";
import TourStep from "../../components/TourStep";
import CC_CONSTANTS from "../../constants";
import useTraceNumericChanges from "../../hooks/useTraceNumericChanges";
import { useApplication } from "../../store/applicationStore";
import { useOrganisation } from "../../store/organisationStore";
import { useParameters } from "../../store/parametersStore";
import EmissionsBreakDown from "./EmissionsBreakDown";
import { useDashboard } from "./store";

function Dashboard() {
  const { parameter, reportingPeriods } = useParameters();
  const {
    report,
    reportBaseYear,
    isReportLoading,
    selectedReportingYear,
    selectReportingYear,
  } = useDashboard();
  const { currentUserData } = useApplication();
  const { organisation } = useOrganisation();
  const { traceNumericChanges } = useTraceNumericChanges();
  if (isReportLoading) return <Loading />;
  if (!report)
    return <p className="text-center m-5">There is no data at the minute.</p>;
  const topCategories = Object.values(report?.scopeBasedEmissionResults)
    .reduce((finalList, currentScope) => {
      return [
        ...finalList,
        ...currentScope.categories?.map((cat) => ({
          name: cat.category,
          scopeName: currentScope._id,
          totalCO2eEmissions: cat.totalCO2eEmissions,
          percentageCO2eOfTotal: cat.percentageCO2eOfTotal,
        })),
      ];
    }, [])
    .sort((a, b) => (a.totalCO2eEmissions > b.totalCO2eEmissions ? -1 : 1))
    .slice(0, 5);
  const topActivities = report?.activityBasedEmissionResults
    .sort((a, b) => (a.totalCO2eEmissions > b.totalCO2eEmissions ? -1 : 1))
    .slice(0, 5);
  let reduction = traceNumericChanges(
    report?.scopeBasedEmissionSummary?.grandTotalCO2eEmissions,
    reportBaseYear?.scopeBasedEmissionSummary?.grandTotalCO2eEmissions
  ).number;
  let alertMessage =
    reduction > 0
      ? `You have increased your Greenhouse GHG emission by ${Math.abs(
          reduction
        )}% in ${selectedReportingYear?.year || "Year not selected"}`
      : `You successfully achieved a reduction of ${Math.abs(
          reduction
        )}% in your greenhouse gas (GHG) emissions - ${
          selectedReportingYear?.year || "Year not selected"
        }`;
  return (
    <TourStep stepId="dashboard-section">
      <div className="main-dashboard border-top">
        <div className="content bg-secondary-extra-light">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span>
              <h4 className="d-inline">{organisation?.name} Carbon Overview</h4>{" "}
              {/* <span>Carbon overview during reporting period</span> */}
            </span>
            <TourStep stepId={"dashboard-year-change-drop-down"}>
              <div className="d-inline-block">
                <InputGroup>
                  <InputGroupText>
                    {" "}
                    <b className="text-dark">Reporting Year: </b>{" "}
                    {selectedReportingYear?.year || ""}
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
            </TourStep>
          </div>
          <Row>
            <Col md="12">
              <TourStep stepId={"dashboard-top-four-cards"}>
                <Card className="top-bar">
                  <Row className="py-4">
                    <Col md="3" className="border-end">
                      <div className="tile d-flex align-items-center justify-content-between py-2 px-4">
                        <div>
                          <p className="pb-2">Total Emissions</p>
                          <h4 className="d-inline">
                            {parseFloat(
                              report?.scopeBasedEmissionSummary
                                .grandTotalCO2eEmissions
                            )
                              .toFixed(2)
                              .toLocaleLowerCase()}
                          </h4>
                          <p className="d-inline">
                            {" "}
                            t
                            <GasInChemicalFormat
                              gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E}
                            />
                          </p>
                        </div>
                        <div className="md-icon-container">
                          <FaChartPie />
                        </div>
                      </div>
                    </Col>
                    <Col md="3" className="border-end">
                      <div className="tile d-flex align-items-center justify-content-between py-2 px-4">
                        <div>
                          <p className="pb-2">Scope 1 Emissions</p>
                          <h4 className="d-inline">
                            {parseFloat(
                              report?.scopeBasedEmissionResults[
                                CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_1
                              ].grandTotalCO2eEmissions || 0
                            )
                              .toFixed(2)
                              .toLocaleString()}
                          </h4>
                          <p className="d-inline">
                            {" "}
                            t
                            <GasInChemicalFormat
                              gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E}
                            />
                          </p>
                        </div>
                        <div className="md-icon-container">
                          <ImFire />
                        </div>
                      </div>
                    </Col>
                    <Col md="3" className="border-end">
                      <div className="tile d-flex align-items-center justify-content-between py-2 px-4">
                        <div>
                          <p className="pb-2">Scope 2 Emissions</p>
                          <h4 className="d-inline">
                            {parseFloat(
                              report?.scopeBasedEmissionResults[
                                CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_2
                              ].grandTotalCO2eEmissions || 0
                            )
                              .toFixed(2)
                              .toLocaleString()}
                          </h4>
                          <p className="d-inline">
                            {" "}
                            t
                            <GasInChemicalFormat
                              gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E}
                            />
                          </p>
                        </div>
                        <div className="md-icon-container">
                          <MdOutlineElectricalServices />
                        </div>
                      </div>
                    </Col>
                    <Col md="3">
                      <div className="tile d-flex align-items-center justify-content-between py-2 px-4">
                        <div>
                          <p className="pb-2">Scope 3 Emissions</p>
                          <h4 className="d-inline">
                            {" "}
                            {parseFloat(
                              report?.scopeBasedEmissionResults[
                                CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_3
                              ].grandTotalCO2eEmissions || 0
                            )
                              .toFixed(2)
                              .toLocaleString()}
                          </h4>
                          <p className="d-inline">
                            {" "}
                            t
                            <GasInChemicalFormat
                              gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E}
                            />
                          </p>
                        </div>
                        <div className="md-icon-container">
                          <FaTruckPlane />
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card>
              </TourStep>
            </Col>
            {/* <Col md="12">
              {selectReportingYear && (
                <UncontrolledAlert color="warning">
                  {alertMessage}
                </UncontrolledAlert>
              )}
            </Col> */}
            <Col md="12">
              <Card>
                <CardBody>
                  <h5 className="d-inline">{organisation?.name}</h5> is
                  dedicated to reducing greenhouse gas emissions by{" "}
                  <h5 className="d-inline">
                    {parameter?.netZeroReductionPercentageAmbition}%
                  </h5>{" "}
                  by <h5 className="d-inline">{parameter?.netZeroTargtYear}</h5>
                  .
                </CardBody>
              </Card>
              <TourStep stepId={"dashboard-category-chart"}>
                <Card>
                  <CardHeader>
                    {" "}
                    <span className="icon-container-circle">
                      <FaLeaf />
                    </span>{" "}
                    Greenhouse Gas Emission Overview
                  </CardHeader>
                  <CardBody>
                    <EmissionsBreakDown />
                  </CardBody>
                </Card>
              </TourStep>
            </Col>

            {/* <Col md="6">
              <Card>
                <CardHeader>
                  <span className="icon-container-circle">
                    <TbTargetArrow />
                  </span>{" "}
                  Target
                </CardHeader>
                <CardBody>
                  <Table>
                    <tbody>
                      <tr>
                        <td className="d-flex align-items-center border-0">
                          <span className="icon-container-square">
                            <MdOutlineCalendarToday />
                          </span>{" "}
                          Net zero target year
                        </td>
                        <td className="border-0">
                          {parameter?.netZeroTargtYear}
                        </td>
                      </tr>
                      <tr>
                        <td className="d-flex align-items-center border-0">
                          <span className="icon-container-square">
                            <LuGoal />
                          </span>{" "}
                          Reduction ambitions
                        </td>
                        <td className="border-0">
                          {parameter?.netZeroReductionPercentageAmbition}%
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            </Col> */}
          </Row>
          <TourStep stepId={"dashboard-bottom-two-table"}>
            <Row>
              <Col md="6">
                <Card>
                  <CardHeader>
                    <span className="icon-container-circle">
                      <LuCloudCog />
                    </span>{" "}
                    Categories with highest emissions
                  </CardHeader>
                  <CardBody>
                    <Table>
                      <thead>
                        <tr>
                          <th className="border-0">Category</th>
                          <th className="border-0">Total Emissions</th>
                          <th className="border-0 pull-right">Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topCategories.map((cat) => {
                          return (
                            <tr key={cat.name + cat.totalCO2eEmissions}>
                              <td className="d-flex align-items-center border-0">
                                <span className="icon-container-square">
                                  <CategoryIcon category={cat.name} />
                                </span>{" "}
                                {cat.name}
                              </td>
                              <td className="border-0">
                                {parseInt(
                                  cat.totalCO2eEmissions
                                ).toLocaleString()}{" "}
                                t
                                <GasInChemicalFormat
                                  gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E}
                                />
                              </td>
                              <td className="border-0">
                                {parseInt(cat.percentageCO2eOfTotal)}% of total{" "}
                                {cat.scopeName}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </CardBody>
                </Card>
                {/* <Card>
                <CardHeader>
                  <span className="icon-container-circle">
                    <MdOutlineLightbulb />
                  </span>{" "}
                  Emission insights
                </CardHeader>
                <CardBody>
                  <Table>
                    <tbody>
                      {Object.values(CC_CONSTANTS.CC_EMISSION_SCOPES).map(
                        (scope) => {
                          return (
                            <tr
                              key={
                                scope +
                                report?.scopeBasedEmissionResults[scope]
                                  .grandPercentageCO2eOfTotal
                              }
                            >
                              <td className="border-0">{scope}</td>
                              <td className="border-0">
                                {
                                  report?.scopeBasedEmissionResults[scope]
                                    .grandTotalCO2eEmissions
                                }
                                t -
                                {
                                  report?.scopeBasedEmissionResults[scope]
                                    .grandPercentageCO2eOfTotal
                                }
                                %
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </Table>
                </CardBody>
              </Card> */}

                {/* <Card>
              <CardHeader>
                <span className="icon-container-circle">
                  <FaHistory />
                </span>{" "}
                Emissions History
              </CardHeader>
              <CardBody>
                <ScopeEmissionChart />
                <IntensityRatioChart />
              </CardBody>
            </Card> */}
              </Col>
              <Col md="6">
                <Card>
                  <CardHeader>
                    <span className="icon-container-circle">
                      <LuFootprints />
                    </span>{" "}
                    Activities generating most emissions
                  </CardHeader>
                  <CardBody>
                    <Table>
                      <thead>
                        <tr>
                          <th className="border-0">Activity</th>
                          <th className="border-0 pull-right">
                            Total emissions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {topActivities.map((activity, index) => {
                          return (
                            <tr key={activity._id}>
                              <td className="d-flex align-items-center border-0">
                                <span className="icon-container-square">
                                  <span>{index + 1}</span>
                                </span>{" "}
                                {activity._id}
                              </td>
                              <td className="border-0">
                                {parseInt(
                                  activity.totalCO2eEmissions
                                ).toLocaleString()}{" "}
                                t
                                <GasInChemicalFormat
                                  gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </TourStep>
        </div>
      </div>
    </TourStep>
  );
}

export default Dashboard;
