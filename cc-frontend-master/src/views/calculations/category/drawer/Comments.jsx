import React from "react";
import { useCategoryCalculation } from "../store";
import ActivityTimeLine from "../../../sharedSections/activityTimeline/Index";
export default function InputSettings({}) {
  const { viewingCategoryCalculation } = useCategoryCalculation();
  if (!viewingCategoryCalculation) return null;
  return (
    <React.Fragment>
      <ActivityTimeLine
        moduleType={"cccalculations"}
        module={viewingCategoryCalculation?._id}
      />
    </React.Fragment>
  );
}
