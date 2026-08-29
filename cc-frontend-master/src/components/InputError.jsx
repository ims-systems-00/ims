import React from "react";
import { BiMessageSquareError } from "react-icons/bi";
function InputError({ children }) {
  return (
    <small className="text-danger px-3">
      <BiMessageSquareError /> {children}
    </small>
  );
}
export default InputError;
