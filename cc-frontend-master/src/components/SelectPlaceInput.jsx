import React from "react";
import { FormGroup, Select, Label } from "@ims-systems-00/ims-ui-kit";
import InputError from "./InputError";
import usePlacesAutocomplete from "use-places-autocomplete";
function SelectPlaceInput({
  label = "",
  error = "",
  mandatorySymbol = false,
  onSelect = function () {},
  ...props
}) {
  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
  } = usePlacesAutocomplete();
  return (
    <FormGroup>
      {label && (
        <Label>
          {label} {mandatorySymbol && <span className="text-danger">•</span>}
        </Label>
      )}
      <Select
        {...props}
        variant="filled"
        onChange={onSelect}
        onInputChange={setValue}
        options={
          status === "OK"
            ? data.map((place) => ({
                value: place.description,
                label: place.description,
              }))
            : []
        }
      />
      {error && <InputError>{error}</InputError>}
    </FormGroup>
  );
}

export default SelectPlaceInput;
