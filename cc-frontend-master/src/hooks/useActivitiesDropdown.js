import CC_CONSTANTS from "../constants";

export function getCalculationMethodDropdown(category) {
  return CC_CONSTANTS.CC_CALCULATION_METHODS_DROPDOWNS[category] || [];
}

export function getCombinedActivityReferenceDropdown(
  category,
  calculationMethod
) {
  if (!CC_CONSTANTS.CC_COMBINED_REFERENCE_AND_ACTIVITIES_DROPDOWNS[category])
    return [];
  if (
    !CC_CONSTANTS.CC_COMBINED_REFERENCE_AND_ACTIVITIES_DROPDOWNS[category][
      calculationMethod
    ]
  )
    return [];

  return CC_CONSTANTS.CC_COMBINED_REFERENCE_AND_ACTIVITIES_DROPDOWNS[category][
    calculationMethod
  ];
}
export function getUnitDropdown(
  category,
  calculationMethod,
  combinedActivityReference
) {
  if (!CC_CONSTANTS.CC_UNITS_DROPDOWNS[category]) return [];
  if (!CC_CONSTANTS.CC_UNITS_DROPDOWNS[category][calculationMethod]) return [];
  if (
    !CC_CONSTANTS.CC_UNITS_DROPDOWNS[category][calculationMethod][
      combinedActivityReference
    ]
  )
    return [];
  return CC_CONSTANTS.CC_UNITS_DROPDOWNS[category][calculationMethod][
    combinedActivityReference
  ];
}

export function useActivitiesDropdown() {
  return {
    getUnitDropdown,
    getCombinedActivityReferenceDropdown,
    getCalculationMethodDropdown,
  };
}
