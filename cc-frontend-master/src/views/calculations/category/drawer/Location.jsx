import { useCategoryCalculation } from "../store";
import LocationCard from "../../../../components/LocationCard";
import SelectCCLocationInput from "../../../sharedSections/components/SelectCCLocationInput";
import React from "react";
import { Button } from "@ims-systems-00/ims-ui-kit";
import { RiLinkUnlinkM } from "react-icons/ri";
export default function Location({}) {
  const {
    viewingCategoryCalculation,
    updateCategoryCalculationAndModifyInTheList,
    viewCategoryCalculation,
  } = useCategoryCalculation();
  async function linkLocation(locid) {
    await updateCategoryCalculationAndModifyInTheList(
      viewingCategoryCalculation?._id,
      {
        location: locid,
      }
    );
    await viewCategoryCalculation(viewingCategoryCalculation);
  }
  async function unLinkLocation() {
    await updateCategoryCalculationAndModifyInTheList(
      viewingCategoryCalculation?._id,
      {
        location: null,
      }
    );
    await viewCategoryCalculation(viewingCategoryCalculation);
  }
  if (!viewingCategoryCalculation) return null;
  if (!viewingCategoryCalculation?.location)
    return (
      <SelectCCLocationInput
        onSelect={(selection) => {
          linkLocation(selection.value);
        }}
      />
    );
  return (
    <React.Fragment>
      <LocationCard
        ccLocation={viewingCategoryCalculation?.location}
        center={{
          lat: viewingCategoryCalculation?.location?.lat,
          lng: viewingCategoryCalculation?.location?.lng,
        }}
      />
      <Button
        className="border-0 pull-right"
        outline
        color="danger"
        size="sm"
        onClick={unLinkLocation}
      >
        <RiLinkUnlinkM /> Unlink this location
      </Button>
    </React.Fragment>
  );
}
