import { Select, InputGroup, InputGroupText } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import InputError from "./InputError";
function SelectEditableLi({ label = "", error = "", ...props }) {
  return (
    <InputGroup>
      <InputGroupText className="text-dark">{label}</InputGroupText>
      <Select
        classNames={{
          control: () => "text-end",
        }}
        variant="filled"
        {...props}
      />
      {error && <InputError>{error}</InputError>}
    </InputGroup>
  );
}

export default SelectEditableLi;
