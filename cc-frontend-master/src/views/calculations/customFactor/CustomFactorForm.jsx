import { useForm } from "@ims-systems-00/ims-react-hooks";
import { Button, Form } from "@ims-systems-00/ims-ui-kit";
import React, { useEffect } from "react";
import If from "../../../components/If";
import SelectInput from "../../../components/SelectInput";
import TextInput from "../../../components/TextInput";
import CC_CONSTANTS from "../../../constants";
import useApplicableCalculationField, {
  CALCULATION_FIELD_NAMES,
} from "../../../hooks/useApplicableCalculationField";
import {
  customFactorFormValidaionSchema,
  getCustomFactorFormState,
} from "./dto/customFactor.dto";

function CustomFactorForm({
  category = null,
  customFactor = null,
  onSubmit = async function () {},
}) {
  const {
    dataModel,
    initiateDataModel,
    validationErrors,
    handleChange,
    handleSubmit,
    isBusy,
  } = useForm(getCustomFactorFormState(), customFactorFormValidaionSchema);
  useEffect(() => {
    initiateDataModel(getCustomFactorFormState(customFactor));
  }, [customFactor]);
  const { isApplicableFieldForCategory } = useApplicableCalculationField();
  return (
    <Form>
      <TextInput
        label="Activity reference"
        mandatorySymbol
        placeholder="e.g., "
        value={dataModel.combinedActivityReference}
        error={validationErrors.combinedActivityReference}
        onChange={(changes) =>
          handleChange({
            field: "combinedActivityReference",
            value: changes.currentTarget.value,
          })
        }
      />
      <TextInput
        label="Unit of Measurement"
        mandatorySymbol
        placeholder="e.g., "
        value={dataModel.uom}
        error={validationErrors.uom}
        onChange={(changes) =>
          handleChange({
            field: "uom",
            value: changes.currentTarget.value,
          })
        }
      />
      <TextInput
        type="number"
        mandatorySymbol
        label="KG CO2e/Unit (GHG conversion factor)"
        placeholder="e.g., "
        value={dataModel.ghgConversionFactor}
        error={validationErrors.ghgConversionFactor}
        onChange={(changes) =>
          handleChange({
            field: "ghgConversionFactor",
            value: changes.currentTarget.value,
          })
        }
      />
      <If
        expression={isApplicableFieldForCategory(
          category,
          CALCULATION_FIELD_NAMES.PURCHASED_ELECTRICITY_COAL
        )}
      >
        <TextInput
          label="Purchased Coal"
          type="number"
          placeholder="e.g., "
          value={dataModel.purchasedElectricityCoal}
          error={validationErrors.purchasedElectricityCoal}
          onChange={(changes) =>
            handleChange({
              field: "purchasedElectricityCoal",
              value: changes.currentTarget.value,
            })
          }
        />
      </If>
      <If
        expression={isApplicableFieldForCategory(
          category,
          CALCULATION_FIELD_NAMES.PURCHASED_ELECTRICITY_NATURAL_GAS
        )}
      >
        <TextInput
          label="Purchased Gas"
          type="number"
          placeholder="e.g., "
          value={dataModel.purchasedElectricityNaturalGas}
          error={validationErrors.purchasedElectricityNaturalGas}
          onChange={(changes) =>
            handleChange({
              field: "purchasedElectricityNaturalGas",
              value: changes.currentTarget.value,
            })
          }
        />
      </If>
      <If
        expression={isApplicableFieldForCategory(
          category,
          CALCULATION_FIELD_NAMES.PURCHASED_ELECTRICITY_NUCLEAR
        )}
      >
        <TextInput
          label="Purchased Nuclear"
          type="number"
          placeholder="e.g., "
          value={dataModel.purchasedElectricityNuclear}
          error={validationErrors.purchasedElectricityNuclear}
          onChange={(changes) =>
            handleChange({
              field: "purchasedElectricityNuclear",
              value: changes.currentTarget.value,
            })
          }
        />
      </If>
      <If
        expression={isApplicableFieldForCategory(
          category,
          CALCULATION_FIELD_NAMES.PURCHASED_ELECTRICITY_RENEWABLES
        )}
      >
        <TextInput
          label="Purchased Renewables"
          type="number"
          placeholder="e.g., "
          value={dataModel.purchasedElectricityRenewables}
          error={validationErrors.purchasedElectricityRenewables}
          onChange={(changes) =>
            handleChange({
              field: "purchasedElectricityRenewables",
              value: changes.currentTarget.value,
            })
          }
        />
      </If>
      <If
        expression={isApplicableFieldForCategory(
          category,
          CALCULATION_FIELD_NAMES.PURCHASED_ELECTRICITY_OTHER
        )}
      >
        <TextInput
          label="Purchased Other"
          type="number"
          placeholder="e.g., "
          value={dataModel.purchasedElectricityOther}
          error={validationErrors.purchasedElectricityOther}
          onChange={(changes) =>
            handleChange({
              field: "purchasedElectricityOther",
              value: changes.currentTarget.value,
            })
          }
        />
      </If>
      <TextInput
        label="Source"
        mandatorySymbol
        placeholder="e.g., "
        value={dataModel.source}
        error={validationErrors.source}
        onChange={(changes) =>
          handleChange({
            field: "source",
            value: changes.currentTarget.value,
          })
        }
      />
      <TextInput
        label="Source Link"
        mandatorySymbol
        placeholder="e.g., "
        value={dataModel.sourceLink}
        error={validationErrors.sourceLink}
        onChange={(changes) =>
          handleChange({
            field: "sourceLink",
            value: changes.currentTarget.value,
          })
        }
      />
      <TextInput
        label="Source Notes"
        placeholder="e.g., "
        value={dataModel.sourceNotes}
        error={validationErrors.sourceNotes}
        onChange={(changes) =>
          handleChange({
            field: "sourceNotes",
            value: changes.currentTarget.value,
          })
        }
      />
      <SelectInput
        label="Grade"
        mandatorySymbol
        value={dataModel.grade}
        error={validationErrors["grade.value"]}
        options={Object.values(CC_CONSTANTS.CC_DATA_QUALITY_GRADES).map(
          (i) => ({
            value: i,
            label: i,
          })
        )}
        onChange={(changes) =>
          handleChange({
            field: "grade",
            value: changes,
          })
        }
      />
      <Button
        color={"primary"}
        onClick={(e) => {
          handleSubmit(e, onSubmit);
        }}
      >
        {customFactor ? (
          <React.Fragment>
            {!isBusy ? "Update factor" : "Updating..."}
          </React.Fragment>
        ) : (
          <React.Fragment>
            {!isBusy ? "Create factor" : "Creating..."}
          </React.Fragment>
        )}
      </Button>
    </Form>
  );
}

export default CustomFactorForm;
