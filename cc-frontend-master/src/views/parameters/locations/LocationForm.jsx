import { Button, Form } from "@ims-systems-00/ims-ui-kit";
import React, { useEffect } from "react";
import TextInput from "../../../components/TextInput";
import {
  getLocationFormState,
  locationFormValidaionSchema,
} from "./dto/location.dto";
import SelectInput from "../../../components/SelectInput";
import CC_CONSTANTS from "../../../constants";
import SelectPlaceInput from "../../../components/SelectPlaceInput";
import { useForm } from "@ims-systems-00/ims-react-hooks";
import TourStep from "../../../components/TourStep";
function LocationForm({ location = null, onSubmit = async function () {} }) {
  const {
    dataModel,
    initiateDataModel,
    validationErrors,
    handleChange,
    handleSubmit,
    isBusy,
    isFormValid,
  } = useForm(getLocationFormState(), locationFormValidaionSchema);
  useEffect(() => {
    initiateDataModel(getLocationFormState(location));
  }, [location]);
  return (
    <Form>
      <TourStep stepId={"location-name-input"}>
        <TextInput
          label="Location Name"
          mandatorySymbol
          placeholder="e.g. Head Office"
          value={dataModel.locationRef}
          error={validationErrors.locationRef}
          onChange={(changes) =>
            handleChange({
              field: "locationRef",
              value: changes.currentTarget.value,
            })
          }
        />
      </TourStep>
      <h5>Pick the location on the map </h5>
      <TourStep stepId={"location-map-picker"}>
        <SelectPlaceInput
          label="Address"
          mandatorySymbol
          placeholder="e.g., 1234 Elm St, Springfield, IL 62704"
          value={dataModel.addressInMap}
          error={validationErrors["addressInMap?.value"]}
          onSelect={(changes) =>
            handleChange({
              field: "addressInMap",
              value: changes,
            })
          }
        />
      </TourStep>
      <h5> Or Manually Enter the Address</h5>
      <TourStep stepId={"manual-address-input"}>
        <TextInput
          label="Building"
          mandatorySymbol
          placeholder="e.g. Head Office"
          value={dataModel.addressBuilding}
          error={validationErrors.addressBuilding}
          onChange={(changes) =>
            handleChange({
              field: "addressBuilding",
              value: changes.currentTarget.value,
            })
          }
        />
        <TextInput
          label="Street"
          mandatorySymbol
          placeholder="e.g. Head Office"
          value={dataModel.addressStreet}
          error={validationErrors.addressStreet}
          onChange={(changes) =>
            handleChange({
              field: "addressStreet",
              value: changes.currentTarget.value,
            })
          }
        />
        <TextInput
          label="City"
          mandatorySymbol
          placeholder="e.g. Head Office"
          value={dataModel.addressCity}
          error={validationErrors.addressCity}
          onChange={(changes) =>
            handleChange({
              field: "addressCity",
              value: changes.currentTarget.value,
            })
          }
        />
        <TextInput
          label="Post Code"
          mandatorySymbol
          placeholder="e.g. Head Office"
          value={dataModel.addressPostCode}
          error={validationErrors.addressPostCode}
          onChange={(changes) =>
            handleChange({
              field: "addressPostCode",
              value: changes.currentTarget.value,
            })
          }
        />
        <TextInput
          label="State Province"
          mandatorySymbol
          placeholder="e.g. Head Office"
          value={dataModel.addressStateProvince}
          error={validationErrors.addressStateProvince}
          onChange={(changes) =>
            handleChange({
              field: "addressStateProvince",
              value: changes.currentTarget.value,
            })
          }
        />

        <TextInput
          label="Country"
          mandatorySymbol
          placeholder="e.g. Head Office"
          value={dataModel.addressCountry}
          error={validationErrors.addressCountry}
          onChange={(changes) =>
            handleChange({
              field: "addressCountry",
              value: changes.currentTarget.value,
            })
          }
        />
      </TourStep>
      <h5>Other Details</h5>
      <TourStep stepId={"other-details-section"}>
        <TextInput
          type="textarea"
          placeholder="Describe the activities conducted at this location"
          label="Description of activities"
          value={dataModel.descriptionOfActivities}
          error={validationErrors.descriptionOfActivities}
          onChange={(changes) =>
            handleChange({
              field: "descriptionOfActivities",
              value: changes.currentTarget.value,
            })
          }
        />
        <SelectInput
          label="GHG assessment inclusion"
          mandatorySymbol
          placeholder="e.g., Inlcude"
          value={dataModel.ghgAssessmentInclusion}
          error={validationErrors["ghgAssessmentInclusion.value"]}
          options={Object.values(CC_CONSTANTS.CC_GHG_INCLUSION_ASSESSMENT).map(
            (i) => ({
              value: i,
              label: i,
            })
          )}
          onChange={(changes) =>
            handleChange({
              field: "ghgAssessmentInclusion",
              value: changes,
            })
          }
        />
        <TextInput
          type="textarea"
          placeholder="Additional comments or notes"
          label="Comment"
          value={dataModel.comment}
          error={validationErrors.comment}
          onChange={(changes) =>
            handleChange({
              field: "comment",
              value: changes.currentTarget.value,
            })
          }
        />
      </TourStep>
      <TourStep stepId={"add-location-submit-button"}>
        <Button
          disabled={!isFormValid()}
          color={"primary"}
          onClick={(e) => {
            handleSubmit(e, onSubmit);
          }}
        >
          {location ? (
            <React.Fragment>
              {!isBusy ? "Update location" : "Updating..."}
            </React.Fragment>
          ) : (
            <React.Fragment>
              {!isBusy ? "Create location" : "Creating..."}
            </React.Fragment>
          )}
        </Button>
      </TourStep>
    </Form>
  );
}

export default LocationForm;
