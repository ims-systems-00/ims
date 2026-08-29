import React from "react";
import Categories from "./Categories";
import { ReportingBoundariesContextProvider } from "./store";
/**
 *
 * @param {*} parameterId If this optional property is supplied, this component skips API hit to load parameter and uses this parameterId for all it's use cases
 */
function ReportingBoundaries({ parameterId }) {
  return (
    <ReportingBoundariesContextProvider parameterId={parameterId}>
      <Categories />
    </ReportingBoundariesContextProvider>
  );
}

export default ReportingBoundaries;
