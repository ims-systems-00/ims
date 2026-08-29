import {
  Alert,
  Button,
  Card,
  CardBody,
  Col,
  Row,
  UncontrolledPopover,
  PopoverHeader,
  PopoverBody,
} from "@ims-systems-00/ims-ui-kit";
import React, { useEffect } from "react";
import DateInput from "../../../components/DateInput";
import SelectInput from "../../../components/SelectInput";
import CC_CONSTANTS from "../../../constants";
import { useParameters } from "../../../store/parametersStore";
import {
  getParameterFormState,
  parameterFormValidaionSchema,
} from "./dto/parameter.dto";
import { useReportingOverview } from "./store";
import { MdArrowRightAlt } from "react-icons/md";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useForm } from "@ims-systems-00/ims-react-hooks";
import TourStep from "../../../components/TourStep";

function ReportingOverview() {
  const { parameter, isParameterLoading } = useParameters();
  const {
    dataModel,
    handleChange,
    validationErrors,
    initiateDataModel,
    handleSubmit,
    isBusy,
  } = useForm(getParameterFormState(), parameterFormValidaionSchema);
  useEffect(() => {
    initiateDataModel(getParameterFormState(parameter));
  }, [parameter]);
  const { updateParameter } = useReportingOverview();
  const [reportingoverviewRef] = useAutoAnimate();
  return (
    <div ref={reportingoverviewRef}>
      <Card className={"category-tile rounded-3 border-0"}>
        <CardBody>
          <UncontrolledPopover
            placement="bottom"
            target="report-settings-reporting-start-date-information-input"
            popperClassName="border border-1"
          >
            <PopoverHeader>Reporting Start Date</PopoverHeader>
            <PopoverBody color="warning">
              Your <b>Reporting Period</b> is calculated as 365 days from the{" "}
              <b>Reporting Start Date</b>.
            </PopoverBody>
          </UncontrolledPopover>
          <UncontrolledPopover
            placement="bottom"
            target="report-settings-base-year-information-input"
            popperClassName="border border-1"
          >
            <PopoverHeader>Base Year</PopoverHeader>
            <PopoverBody color="warning">
              The Base Year is the reference year for data comparison in yearly
              reports.
            </PopoverBody>
          </UncontrolledPopover>
          <UncontrolledPopover
            placement="bottom"
            target="report-settings-organisational-boundary-information-input"
            popperClassName="border border-1"
          >
            <PopoverHeader>Organisational Boundary</PopoverHeader>
            <PopoverBody color="warning">
              <b> Operational Control: </b>This organizational boundary
              encompasses the emissions from all facilities that you operate and
              control.
              <br></br>
              <b> Financial Control:</b> This organizational boundary includes
              only emissions from entities under your financial control.
              <br></br>
              <b> Equity Share:</b> This organizational boundary will calculate
              your emissions according to your percentage of ownership.
            </PopoverBody>
          </UncontrolledPopover>

          <UncontrolledPopover
            placement="bottom"
            target="report-settings-reporting-method-information-input"
            popperClassName="border border-1"
          >
            <PopoverHeader>Reporting Method</PopoverHeader>
            <PopoverBody color="warning">
              <b>Location-Based:</b> This method is suitable for organizations
              without renewable energy contracts, it assesses emissions using
              average intensity factors from the local power grid.
              <br></br>
              <b> Market-based:</b> This method suits organizations using green
              energy tariffs from energy suppliers using renewable sources. For
              example, if you buy electricity from a supplier using 100%
              renewable sources, your emissions from that electricity are
              considered zero.
            </PopoverBody>
          </UncontrolledPopover>

          <Row>
            <Col md="6">
              <TourStep stepId={"select-the-reporting-start-date"}>
                <DateInput
                  label="Reporting Start Date"
                  timeFormat={false}
                  value={dataModel.reportingStartDate}
                  informationTarget={
                    "report-settings-reporting-start-date-information-input"
                  }
                  error={validationErrors.reportingStartDate}
                  onChange={(changes) =>
                    handleChange({
                      field: "reportingStartDate",
                      value: changes,
                    })
                  }
                />
              </TourStep>
            </Col>

            <Col md="6">
              <TourStep stepId={"select-base-reporting"}>
                <SelectInput
                  label="Base Year"
                  options={CC_CONSTANTS.CC_ALLOWED_NET_ZERO_REPORTING_YEARS.map(
                    (i) => ({ value: i, label: i })
                  )}
                  informationTarget={
                    "report-settings-base-year-information-input"
                  }
                  value={dataModel.baseReportingYear}
                  error={validationErrors.baseReportingYear}
                  onChange={(changes) =>
                    handleChange({
                      field: "baseReportingYear",
                      value: changes,
                    })
                  }
                />
              </TourStep>
            </Col>
          </Row>
          <TourStep stepId={"reporting-method-and-organisational"}>
            <Row>
              <Col md="6">
                <SelectInput
                  label="Reporting Method"
                  options={Object.values(CC_CONSTANTS.CC_REPORTING_METHODS).map(
                    (i) => ({
                      value: i,
                      label: i,
                    })
                  )}
                  informationTarget={
                    "report-settings-reporting-method-information-input"
                  }
                  value={dataModel.primaryReportingMethod}
                  error={validationErrors.primaryReportingMethod}
                  onChange={(changes) =>
                    handleChange({
                      field: "primaryReportingMethod",
                      value: changes,
                    })
                  }
                />
              </Col>
              <Col md="6">
                <SelectInput
                  label="Organisational Boundary"
                  informationTarget={
                    "report-settings-organisational-boundary-information-input"
                  }
                  options={Object.values(
                    CC_CONSTANTS.CC_ORGANISATIONAL_BOUNDARIES
                  ).map((i) => ({
                    value: i,
                    label: i,
                  }))}
                  value={dataModel.organisationalBoundary}
                  error={validationErrors.organisationalBoundary}
                  onChange={(changes) =>
                    handleChange({
                      field: "organisationalBoundary",
                      value: changes,
                    })
                  }
                />
              </Col>
            </Row>
          </TourStep>
          <TourStep stepId={"add-net-zero-target"}>
            <h4 className={"my-3"}>Net Zero Targets </h4>
            <Row>
              <Col md="6">
                <SelectInput
                  label="Net Zero Target Year"
                  options={CC_CONSTANTS.CC_ALLOWED_NET_ZERO_TARGET_YEARS.map(
                    (i) => ({
                      value: i,
                      label: i,
                    })
                  )}
                  value={dataModel.netZeroTargtYear}
                  error={validationErrors.netZeroTargtYear}
                  onChange={(changes) =>
                    handleChange({
                      field: "netZeroTargtYear",
                      value: changes,
                    })
                  }
                />
              </Col>
              <Col md="6">
                <SelectInput
                  label="Carbon Reduction Target (%)"
                  options={Array.from({ length: 21 }, (v, i) => i + 80).map(
                    (i) => ({
                      value: i,
                      label: i,
                    })
                  )}
                  value={dataModel.netZeroReductionPercentageAmbition}
                  error={validationErrors.netZeroReductionPercentageAmbition}
                  onChange={(changes) =>
                    handleChange({
                      field: "netZeroReductionPercentageAmbition",
                      value: changes,
                    })
                  }
                />
              </Col>
            </Row>
          </TourStep>
          <div className="d-grid gap-2 d-md-flex justify-content-md-end mb-2 px-3">
            <TourStep stepId="click-update-button">
              <Button
                color={"primary"}
                className={"rounded-pill border-0"}
                disabled={isBusy}
                onClick={(e) => {
                  handleSubmit(e, async (d) => {
                    let startDate = new Date(d.reportingStartDate.date);
                    await updateParameter(parameter?._id, {
                      reportingStartDate: d.reportingStartDate.date,
                      baseReportingYear:
                        d.baseReportingYear.value ||
                        startDate.getFullYear() ||
                        2021,
                      currentReportingYear: d.currentReportingYear.value,
                      primaryReportingMethod: d.primaryReportingMethod.value,
                      organisationalBoundary: d.organisationalBoundary.value,
                      netZeroTargtYear: d.netZeroTargtYear.value,
                      netZeroReductionPercentageAmbition:
                        d.netZeroReductionPercentageAmbition.value,
                    });
                  });
                }}
              >
                {isBusy ? "Updating configuration..." : "Update configuration"}
                <MdArrowRightAlt />
              </Button>
            </TourStep>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default ReportingOverview;
