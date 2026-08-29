import {
  Alert,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
} from "@ims-systems-00/ims-ui-kit";
import React, { useEffect } from "react";
import { HiOutlineLightBulb } from "react-icons/hi";
import SelectInput from "../../../components/SelectInput";
import TextInput from "../../../components/TextInput";
import { useParameters } from "../../../store/parametersStore";
import RichText from "../../sharedSections/components/RichText";
import {
  getInititveFormState,
  initiativeFormValidaionSchema,
} from "./dto/initiative.dto";
import DateInput from "../../../components/DateInput";
import { useForm } from "@ims-systems-00/ims-react-hooks";
import { MONTH_FULL_NAMES } from "../../calculations/category/dto/categoryCalculation.dto";
import If from "../../../components/If";
import TourStep from "../../../components/TourStep";

function InitiativeForm({
  initiative = null,
  onSubmit = async function () {},
}) {
  const {
    dataModel,
    initiateDataModel,
    validationErrors,
    handleChange,
    handleSubmit,
    isBusy,
  } = useForm(getInititveFormState(), initiativeFormValidaionSchema);
  useEffect(() => {
    initiateDataModel(getInititveFormState(initiative));
  }, [initiative]);
  let { reportingPeriods, parameter } = useParameters();
  const lastReportingPeriod = reportingPeriods[reportingPeriods.length - 1];
  return (
    <Form>
      <TourStep stepId={"all-input-fields-together"}>
        <TextInput
          label="Title"
          placeholder="e.g. title"
          mandatorySymbol
          value={dataModel.title}
          error={validationErrors.title}
          onChange={(changes) =>
            handleChange({
              field: "title",
              value: changes.currentTarget.value,
            })
          }
        />
        <TourStep stepId={"data-identified-alert-box"}>
          <Alert color="warning" className="border border-warning">
            <HiOutlineLightBulb size={20} /> The system will place this
            initiative within the relevant reporting period based on your{" "}
            <b className="text-dark">Date Identified </b> field.
            <br></br>
            <br></br>
            If the <b className="text-dark">Date Identified </b> field is not
            selected this initiative will be automatically added to the 2019
            year for the reporting period:{" "}
            <b className="text-dark">{lastReportingPeriod?.startDate}</b> -{" "}
            <b className="text-dark">{lastReportingPeriod?.endDate}</b>.
            <br></br>
            <br></br>
            Your reporting cycle is:{" "}
            <If expression={parameter?.reportingMonths?.length > 0}>
              <b>{MONTH_FULL_NAMES[parameter?.reportingMonths[0]]}</b> -{" "}
              <b>
                {
                  MONTH_FULL_NAMES[
                    parameter?.reportingMonths[
                      parameter?.reportingMonths?.length - 1
                    ]
                  ]
                }
              </b>
            </If>
            <br></br>
            <br></br>
            <FormGroup check>
              <Input
                type="checkbox"
                checked={dataModel.hasDateIdentified}
                onClick={() => {
                  handleChange({
                    field: "hasDateIdentified",
                    value: !dataModel.hasDateIdentified,
                  });
                }}
              />
              <Label check>
                I want to specify the{" "}
                <b className="text-dark">Date Identified </b> field.
              </Label>
            </FormGroup>
          </Alert>
        </TourStep>
        {dataModel.hasDateIdentified && (
          <DateInput
            label="Date Identified"
            timeFormat={false}
            value={dataModel.identifiedAt}
            error={validationErrors.identifiedAt}
            onChange={(changes) =>
              handleChange({
                field: "identifiedAt",
                value: changes,
              })
            }
          />
        )}

        <RichText
          label="Description"
          value={dataModel.description}
          mandatorySymbol
          onDataStructureChange={function (value) {
            handleChange({
              field: "description",
              value: value,
            });
          }}
          error={validationErrors.description}
        />
        <SelectInput
          label="Priority"
          mandatorySymbol
          value={dataModel.priority}
          error={validationErrors["priority.value"]}
          options={["Low", "Medium", "High", "Critical"].map((i) => ({
            value: i,
            label: i,
          }))}
          onChange={(changes) =>
            handleChange({
              field: "priority",
              value: changes,
            })
          }
        />

        <RichText
          label="Potential Co-Benefits"
          value={dataModel.potentialCoBenefits}
          onDataStructureChange={function (value) {
            handleChange({
              field: "potentialCoBenefits",
              value: value,
            });
          }}
          error={validationErrors.potentialCoBenefits}
        />
        <RichText
          label="Potential Unintended Consequences"
          value={dataModel.potentialUnintendedConsequences}
          onDataStructureChange={function (value) {
            handleChange({
              field: "potentialUnintendedConsequences",
              value: value,
            });
          }}
          error={validationErrors.potentialUnintendedConsequences}
        />
      </TourStep>
      <TourStep stepId={"bottom-date-implemented-checkbox"}>
        <FormGroup>
          <Input
            type="checkbox"
            checked={dataModel.hasDateImplemented}
            onClick={() => {
              handleChange({
                field: "hasDateImplemented",
                value: !dataModel.hasDateImplemented,
              });
            }}
          />{" "}
          <Label check> This initiative is already implemented.</Label>
        </FormGroup>
      </TourStep>
      {dataModel.hasDateImplemented && (
        <React.Fragment>
          <Alert color="warning" className="border border-warning">
            <HiOutlineLightBulb size={20} /> The initiative will be marked as
            implemented on the selected date - if the Date Implemented field is
            not selected this initiative will be automatically completed with
            the current date. This initiative will still remain in the reporting
            period where it was initially identified for reporting purposes.
          </Alert>
          <DateInput
            label="Date Implemented"
            timeFormat={false}
            value={dataModel.implementedAt}
            error={validationErrors.implementedAt}
            onChange={(changes) =>
              handleChange({
                field: "implementedAt",
                value: changes,
              })
            }
          />
        </React.Fragment>
      )}
      <TourStep stepId={"initiative-submit-button"}>
        <Button
          color={"primary"}
          onClick={(e) => {
            handleSubmit(e, onSubmit);
          }}
        >
          {initiative ? (
            <React.Fragment>
              {!isBusy ? "Update initiative" : "Updating..."}
            </React.Fragment>
          ) : (
            <React.Fragment>
              {!isBusy ? "Add initiative" : "Adding..."}
            </React.Fragment>
          )}
        </Button>
      </TourStep>
    </Form>
  );
}

export default InitiativeForm;
