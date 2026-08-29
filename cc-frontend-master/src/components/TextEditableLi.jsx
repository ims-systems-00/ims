import { Input, InputGroup, InputGroupText } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import InputError from "./InputError";
function TextEditableLi({ label = "", error = "", ...props }) {
  return (
    <InputGroup variant="filled">
      <InputGroupText className="text-dark">{label}</InputGroupText>
      <Input variant="filled" className="text-end" {...props} />
      {error && <InputError>{error}</InputError>}
    </InputGroup>
  );
}

export default TextEditableLi;
