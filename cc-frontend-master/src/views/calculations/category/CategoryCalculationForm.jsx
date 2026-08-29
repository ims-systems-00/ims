import { Button, Form, Row, Col, Alert } from "@ims-systems-00/ims-ui-kit";
import React, { useEffect } from "react";
import TextInput from "../../../components/TextInput";
import {
  getCategoryCalculationFormState,
  categroyCalculationFormValidaionSchema,
  getCalculationMethodDropdown,
  getCombinedActivityReferenceDropdown,
  getUnitDropdown,
  isCustomCalculationMethod,
  MONTH_FULL_NAMES,
} from "./dto/categoryCalculation.dto";
import SelectInput from "../../../components/SelectInput";
import CC_CONSTANTS from "../../../constants";
import { useParameters } from "../../../store/parametersStore";
import If from "../../../components/If";
import SelectCustomFactorBasedFieldInput, {
  customFactorSelectableFields,
} from "../../sharedSections/components/SelectCustomFactorBasedFieldInput";
import useApplicableCalculationField, {
  CALCULATION_FIELD_NAMES,
} from "../../../hooks/useApplicableCalculationField";
import SelectCCLocationInput from "../../sharedSections/components/SelectCCLocationInput";
import SelectCustomFactorInput from "../../sharedSections/components/SelectCustomFactorInput";
import { useForm } from "@ims-systems-00/ims-react-hooks";
import CategoryIcon from "../../../components/CategoryIcon";
import TourStep from "../../../components/TourStep";
function CategoryCalculationForm({
  category = null,
  categoryCalculation = null,
  onSubmit = async function () {},
}) {
  if (!category)
    throw new Error(
      "'catgory' is a required property to render calculation form."
    );
  const {
    dataModel,
    initiateDataModel,
    validationErrors,
    handleChange,
    handleSubmit,
    isBusy,
  } = useForm(
    getCategoryCalculationFormState(),
    categroyCalculationFormValidaionSchema
  );
  useEffect(() => {
    initiateDataModel(getCategoryCalculationFormState(categoryCalculation));
  }, [categoryCalculation]);
  const { parameter, reportingPeriods } = useParameters();
  const { isApplicableFieldForCategory } = useApplicableCalculationField();
  const getSelectedReportiongPeriod = (y) => {
    return reportingPeriods.find((d) => d.year === y);
  };
  return (
    <Form>
      <div className="d-flex">
        <div className="md-icon-container me-3">
          <CategoryIcon category={category} />
        </div>
        <h5> {category}</h5>
      </div>

      <hr />
      <TourStep stepId={"add-additional-information"}>
        <TextInput
          label="Reference"
          placeholder="e.g. reference-number"
          value={dataModel.customReference}
          error={validationErrors.customReference}
          onChange={(changes) =>
            handleChange({
              field: "customReference",
              value: changes.currentTarget.value,
            })
          }
        />
        <If
          expression={isApplicableFieldForCategory(
            category,
            CALCULATION_FIELD_NAMES.SUPPLIER_NAME
          )}
        >
          <TextInput
            label="Supplier name"
            placeholder="e.g. Ford"
            value={dataModel.supplierName}
            error={validationErrors.supplierName}
            onChange={(changes) =>
              handleChange({
                field: "supplierName",
                value: changes.currentTarget.value,
              })
            }
          />
        </If>
        <If
          expression={isApplicableFieldForCategory(
            category,
            CALCULATION_FIELD_NAMES.METER_NUMBER
          )}
        >
          <TextInput
            label="Meter Number"
            placeholder="e.g. 12345"
            value={dataModel.meterNumber}
            error={validationErrors.meterNumber}
            onChange={(changes) =>
              handleChange({
                field: "meterNumber",
                value: changes.currentTarget.value,
              })
            }
          />
        </If>
        <If
          expression={isApplicableFieldForCategory(
            category,
            CALCULATION_FIELD_NAMES.INVOICE_NUMBER
          )}
        >
          <TextInput
            label="Invoice Number"
            placeholder="e.g. inv-123"
            value={dataModel.invoiceNumber}
            error={validationErrors.invoiceNumber}
            onChange={(changes) =>
              handleChange({
                field: "invoiceNumber",
                value: changes.currentTarget.value,
              })
            }
          />
        </If>
        <SelectCCLocationInput
          label="Linked Location"
          placeholder="e.g. location-name"
          value={dataModel.location}
          error={validationErrors["location.value"]}
          onSelect={(selection) => {
            handleChange({
              field: "location",
              value: selection,
            });
          }}
        />
      </TourStep>
      <TourStep stepId={"add-reporting-year"}>
        <SelectInput
          label="Reporting Year"
          mandatorySymbol
          value={dataModel.reportingYear}
          error={validationErrors["reportingYear.value"]}
          options={reportingPeriods.map((i) => ({
            value: i.year,
            label: ` ${i.year} (${i.startDate} - ${i.endDate})`,
          }))}
          onChange={(changes) =>
            handleChange({
              field: "reportingYear",
              value: changes,
            })
          }
        />
      </TourStep>
      <If expression={dataModel.reportingYear.value}>
        <Alert className="border border-warning" color="warning">
          The GHG emissions will be included in the{" "}
          <b>{dataModel.reportingYear?.value}</b> report for the reporting
          period:{" "}
          <b>
            {
              getSelectedReportiongPeriod(dataModel.reportingYear?.value)
                ?.period
            }
          </b>
          .<br></br>
          Your reporting cycle is:{" "}
          <If expression={parameter?.reportingMonths}>
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
        </Alert>
      </If>
      <If expression={dataModel.reportingYear.value}>
        <SelectInput
          label="Reporting Month"
          mandatorySymbol
          value={dataModel.reportingMonth}
          error={validationErrors["reportingMonth.value"]}
          options={[
            {
              value: "Annual",
              label:
                "Annual " +
                getSelectedReportiongPeriod(dataModel.reportingYear?.value)
                  ?.period,
            },
            ...(parameter?.reportingMonths
              ? parameter?.reportingMonths?.map((i) => ({
                  value: i,
                  label: MONTH_FULL_NAMES[i],
                }))
              : []),
          ]}
          onChange={(changes) =>
            handleChange({
              field: "reportingMonth",
              value: changes,
            })
          }
          helperText={`For the reporting period: ${
            getSelectedReportiongPeriod(dataModel.reportingYear?.value)?.period
          }`}
        />
      </If>
      <TourStep stepId={"select-relevant-calculations"}>
        <SelectInput
          label="Calculation Method"
          mandatorySymbol
          value={dataModel.calculationMethod}
          error={validationErrors["calculationMethod.value"]}
          options={getCalculationMethodDropdown(category).map((i) => ({
            value: i,
            label: i,
          }))}
          onChange={(changes) =>
            handleChange({
              field: "calculationMethod",
              value: changes,
            })
          }
        />
      </TourStep>
      <If
        expression={
          !isCustomCalculationMethod(dataModel.calculationMethod.value)
        }
      >
        <SelectInput
          label="Type"
          mandatorySymbol
          value={dataModel.activity}
          error={validationErrors["activity.value"]}
          options={getCombinedActivityReferenceDropdown(
            category,
            dataModel.calculationMethod.value
          ).map((i) => ({
            value: i,
            label: i,
          }))}
          onChange={(changes) =>
            handleChange({
              field: "activity",
              value: changes,
            })
          }
        />
        <SelectInput
          label="Unit of Measurement"
          mandatorySymbol
          value={dataModel.unit}
          error={validationErrors["unit.value"]}
          options={getUnitDropdown(
            category,
            dataModel.calculationMethod.value,
            dataModel.activity.value
          ).map((i) => ({
            value: i,
            label: i,
          }))}
          onChange={(changes) =>
            handleChange({
              field: "unit",
              value: changes,
            })
          }
        />
      </If>
      <If
        expression={isCustomCalculationMethod(
          dataModel.calculationMethod.value
        )}
      >
        {/* <SelectCustomFactorBasedFieldInput
          category={category}
          field={customFactorSelectableFields.activity}
          label="Activty"
          mandatorySymbol
          value={dataModel.activity}
          error={validationErrors["activity.value"]}
          onChange={(changes) =>
            handleChange({
              field: "activity",
              value: changes,
            })
          }
        />
        <SelectCustomFactorBasedFieldInput
          category={category}
          field={customFactorSelectableFields.uom}
          label="Unit of measurement"
          mandatorySymbol
          value={dataModel.unit}
          error={validationErrors["uom.value"]}
          onChange={(changes) =>
            handleChange({
              field: "unit",
              value: changes,
            })
          }
        /> */}
        <SelectCustomFactorInput
          category={category}
          label="Select The Custom Factor"
          mandatorySymbol
          value={dataModel.customFactorId}
          error={validationErrors["customFactorId.value"]}
          onChange={(changes) =>
            handleChange({
              field: "customFactorId",
              value: changes,
            })
          }
        />
      </If>
      <TourStep stepId={"add-actual-amount"}>
        <TextInput
          type="number"
          label="Amount"
          mandatorySymbol
          placeholder="e.g., 12000"
          value={dataModel.amount}
          error={validationErrors.amount}
          onChange={(changes) =>
            handleChange({
              field: "amount",
              value: changes.currentTarget.value,
            })
          }
          // onPaste={(e) => {
          //   const pastedValue = e.clipboardData.getData("text");
          //   if (isNaN(pastedValue)) {
          //     e.preventDefault();
          //     alert("Only numeric values are allowed!");
          //   }
          // }}
          onWheel={(e) => {
            e.target?.blur();
          }}
        />
      </TourStep>
      <TourStep stepId={"add-data-grade"}>
        <SelectInput
          label="Activity Data Grade"
          mandatorySymbol
          value={dataModel.activityDataGrade}
          error={validationErrors["activityDataGrade.value"]}
          options={Object.values(CC_CONSTANTS.CC_DATA_QUALITY_GRADES).map(
            (i) => ({
              value: i,
              label: i,
            })
          )}
          onChange={(changes) =>
            handleChange({
              field: "activityDataGrade",
              value: changes,
            })
          }
        />
      </TourStep>
      <TourStep stepId={"add-calculation-submit-button"}>
        <Button
          color={"primary"}
          onClick={(e) => {
            handleSubmit(e, onSubmit);
          }}
        >
          {categoryCalculation ? (
            <React.Fragment>
              {!isBusy ? "Update data" : "Updating..."}
            </React.Fragment>
          ) : (
            <React.Fragment>
              {!isBusy ? "Add data" : "Adding..."}
            </React.Fragment>
          )}
        </Button>
      </TourStep>
    </Form>
  );
}

export default CategoryCalculationForm;
