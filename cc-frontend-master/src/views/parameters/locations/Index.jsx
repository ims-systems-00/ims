import React from "react";
import NoParamsGuard from "../NoParamsGuard";
import { LocationParameterContextProvider } from "./store";
import Locations from "./Locations";

export default function () {
  return (
    <NoParamsGuard>
      <LocationParameterContextProvider>
        <Locations />
      </LocationParameterContextProvider>
    </NoParamsGuard>
  );
}
