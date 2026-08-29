import React from "react";
import { useParameters } from "../../store/parametersStore";
import { Navigate, useNavigate } from "react-router-dom";
function NoParamsGuard({ children }) {
  const { parameter, isParameterLoading } = useParameters();
  if (!isParameterLoading && !parameter) {
    return <Navigate to={"/parameters/get-started"} />;
  }
  return <React.Fragment>{children}</React.Fragment>;
}

export default NoParamsGuard;
