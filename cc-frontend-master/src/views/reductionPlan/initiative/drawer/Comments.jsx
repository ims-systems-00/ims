import React from "react";
import { useInitiatives } from "../store";
import ActivityTimeLine from "../../../sharedSections/activityTimeline/Index";
export default function InputSettings({}) {
  const { viewingInitiative } = useInitiatives();
  if (!viewingInitiative) return null;
  return (
    <React.Fragment>
      <ActivityTimeLine
        moduleType={"cccarbonreductioninitiatives"}
        module={viewingInitiative?._id}
      />
    </React.Fragment>
  );
}
