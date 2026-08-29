import { FormGroup, Input, Label } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import InputError from "./InputError";
function TextInput({
  label = "",
  error = "",
  mandatorySymbol = false,
  ...props
}) {
  return (
    <FormGroup>
      {label && (
        <Label>
          {label} {mandatorySymbol && <span className="text-danger">•</span>}
        </Label>
      )}
      <Input
        variant="filled"
        onWheel={(e) => {
          e.preventDefault();
        }}
        style={{
          appearance: "textfield",
          MozAppearance: "textfield",
        }}
        {...props}
      />
      {error && <InputError>{error}</InputError>}
    </FormGroup>
  );
}

export default TextInput;
