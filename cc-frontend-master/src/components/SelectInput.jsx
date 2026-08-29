import React from "react";
import { FormGroup, Select, Label, FormText, Button } from "@ims-systems-00/ims-ui-kit";
import InputError from "./InputError";
import { GoInfo } from "react-icons/go";

function SelectInput({
  label = "",
  error = "",
  mandatorySymbol = false,
  helperText = "",
  informationTarget = null,
  ...props
}) {
  return (
    <FormGroup>
      {label && (
        <Label>
          {label} {mandatorySymbol && <span className="text-danger">•</span>}
          {informationTarget && (
            <Button
              id={informationTarget}
              size="sm"
              outline
              className="border border-0"
            >
              <GoInfo className="mb-1" size={18}  />
            </Button>
          )}
        </Label>
      )}
      <Select variant="filled" {...props} />
      {helperText && <FormText color="secondary">{helperText}</FormText>}
      {error && <InputError>{error}</InputError>}
    </FormGroup>
  );
}

export default SelectInput;
