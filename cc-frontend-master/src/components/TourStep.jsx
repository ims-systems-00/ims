import React from "react";
function TourStep({ children, stepId, ...rest }) {
  return (
    <span data-tour-step={stepId} {...rest}>
      {children}
    </span>
  );
}
export default TourStep;
