import React from "react";
import { Button } from "@ims-systems-00/ims-ui-kit";
import CC_CONSTANTS from "../constants";

export const categoryFilters = {
  all: {
    text: "All",
    value: "All",
  },
  scope1: {
    text: `${CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_1}: ${CC_CONSTANTS.CC_EMISSION_SCOPE_NAMES.SCOPE_1_NAME}`,
    value: CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_1,
  },
  scope2: {
    text: `${CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_2}: ${CC_CONSTANTS.CC_EMISSION_SCOPE_NAMES.SCOPE_2_NAME}`,
    value: CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_2,
  },
  scope3: {
    text: `${CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_3}: ${CC_CONSTANTS.CC_EMISSION_SCOPE_NAMES.SCOPE_3_NAME}`,
    value: CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_3,
  },
};

/**
 * This component is supposed to be a simple and short component, no advanced filtering is
 * needed.
 */
function CategoryFilters({ onFilter = () => {} }) {
  const [currentFilter, setCurrentFilter] = React.useState("All");
  return (
    <React.Fragment>
      {Object.values(categoryFilters).map((scope) => (
        <Button
          key={scope.text}
          color={currentFilter === scope.text ? "primary" : "secondary"}
          size={"sm"}
          className={"rounded-pill mt-2"}
          onClick={() => {
            setCurrentFilter(scope.text);
            onFilter(scope.value);
          }}
        >
          {scope.text}
        </Button>
      ))}
    </React.Fragment>
  );
}

export default CategoryFilters;
