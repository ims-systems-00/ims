import CC_CONSTANTS from "../../../constants";
const CC_DATA_QUALITY_INFORMATION_EXAMPLE_1 = {
  [CC_CONSTANTS.CC_DATA_QUALITY_GRADES.VERY_GOOD]: {
    DEFINITION:
      CC_CONSTANTS.CC_DATA_QUALITY_INFORMATION[
        CC_CONSTANTS.CC_DATA_QUALITY_GRADES.VERY_GOOD
      ].DEFINITION,
    ACTIVITY_DATA_CRITERIA:
      "Monthly meter readings for electricity usage during the reporting year.",
    EMISSION_FACTOR_CRITERIA:
      "Emission factors provided by the electricity supplier, verified by an independent third-party.",
  },
  [CC_CONSTANTS.CC_DATA_QUALITY_GRADES.GOOD]: {
    DEFINITION:
      CC_CONSTANTS.CC_DATA_QUALITY_INFORMATION[
        CC_CONSTANTS.CC_DATA_QUALITY_GRADES.GOOD
      ].DEFINITION,
    ACTIVITY_DATA_CRITERIA:
      "Estimated electricity consumption based on the previous year, adjusted for known changes.",
    EMISSION_FACTOR_CRITERIA:
      "National average emission factors for grid electricity, updated within the last year.",
  },
  [CC_CONSTANTS.CC_DATA_QUALITY_GRADES.FAIR]: {
    DEFINITION:
      CC_CONSTANTS.CC_DATA_QUALITY_INFORMATION[
        CC_CONSTANTS.CC_DATA_QUALITY_GRADES.FAIR
      ].DEFINITION,
    ACTIVITY_DATA_CRITERIA:
      "Historical electricity usage data, adjusted using generic growth rates.",
    EMISSION_FACTOR_CRITERIA:
      "Emission factors from broader regional studies, not specific to the exact grid mix",
  },
  [CC_CONSTANTS.CC_DATA_QUALITY_GRADES.BASIC]: {
    DEFINITION:
      CC_CONSTANTS.CC_DATA_QUALITY_INFORMATION[
        CC_CONSTANTS.CC_DATA_QUALITY_GRADES.BASIC
      ].DEFINITION,
    ACTIVITY_DATA_CRITERIA:
      "Broad estimates of electricity usage based on facility size and type, without actual data.",
    EMISSION_FACTOR_CRITERIA:
      "Non-specific emission factors from international datasets not tailored to the local grid.",
  },
};
const CC_DATA_QUALITY_INFORMATION_EXAMPLE_2 = {
  [CC_CONSTANTS.CC_DATA_QUALITY_GRADES.VERY_GOOD]: {
    DEFINITION:
      CC_CONSTANTS.CC_DATA_QUALITY_INFORMATION[
        CC_CONSTANTS.CC_DATA_QUALITY_GRADES.VERY_GOOD
      ].DEFINITION,
    ACTIVITY_DATA_CRITERIA:
      "Accurate records of the weight of paper purchased, confirmed by delivery notes and usage logs.",
    EMISSION_FACTOR_CRITERIA:
      "Emission factors provided by the paper supplier, specific to the type of paper and verified.",
  },
  [CC_CONSTANTS.CC_DATA_QUALITY_GRADES.GOOD]: {
    DEFINITION:
      CC_CONSTANTS.CC_DATA_QUALITY_INFORMATION[
        CC_CONSTANTS.CC_DATA_QUALITY_GRADES.GOOD
      ].DEFINITION,
    ACTIVITY_DATA_CRITERIA:
      "Estimated paper consumption based on job orders and standard paper weights.",
    EMISSION_FACTOR_CRITERIA:
      "Recognised industry average emission factors for paper manufacturing, updated within the last year.",
  },
  [CC_CONSTANTS.CC_DATA_QUALITY_GRADES.FAIR]: {
    DEFINITION:
      CC_CONSTANTS.CC_DATA_QUALITY_INFORMATION[
        CC_CONSTANTS.CC_DATA_QUALITY_GRADES.FAIR
      ].DEFINITION,
    ACTIVITY_DATA_CRITERIA:
      "Historical financial expenditure on paper adjusted for known changes in pricing or operations.",
    EMISSION_FACTOR_CRITERIA:
      "Broader regional emission factors, somewhat outdated but still commonly used within the industry.",
  },
  [CC_CONSTANTS.CC_DATA_QUALITY_GRADES.BASIC]: {
    DEFINITION:
      CC_CONSTANTS.CC_DATA_QUALITY_INFORMATION[
        CC_CONSTANTS.CC_DATA_QUALITY_GRADES.BASIC
      ].DEFINITION,
    ACTIVITY_DATA_CRITERIA:
      "Non-specific financial allocations for paper spending, not linked to actual paper types or weights.",
    EMISSION_FACTOR_CRITERIA:
      "Non-specific international emission factors applied without significant adjustment for local practices.",
  },
};
const CC_DATA_QUALITY_INFORMATION_EXAMPLE_3 = {
  [CC_CONSTANTS.CC_DATA_QUALITY_GRADES.VERY_GOOD]: {
    DEFINITION:
      CC_CONSTANTS.CC_DATA_QUALITY_INFORMATION[
        CC_CONSTANTS.CC_DATA_QUALITY_GRADES.VERY_GOOD
      ].DEFINITION,
    ACTIVITY_DATA_CRITERIA:
      "Accurate records of the weight of sold products, distances travelled, and types of vehicles used, all verified within the reporting period.",
    EMISSION_FACTOR_CRITERIA:
      "Emission factors specific to vehicle type and fuel, provided by transport service providers and verified.",
  },
  [CC_CONSTANTS.CC_DATA_QUALITY_GRADES.GOOD]: {
    DEFINITION:
      CC_CONSTANTS.CC_DATA_QUALITY_INFORMATION[
        CC_CONSTANTS.CC_DATA_QUALITY_GRADES.GOOD
      ].DEFINITION,
    ACTIVITY_DATA_CRITERIA:
      "Estimates of product weight based on standard shipment sizes, distances from logistics software, and known vehicle types.",
    EMISSION_FACTOR_CRITERIA:
      "Recognised industry average emission factors for transportation, reflecting recent data.",
  },
  [CC_CONSTANTS.CC_DATA_QUALITY_GRADES.FAIR]: {
    DEFINITION:
      CC_CONSTANTS.CC_DATA_QUALITY_INFORMATION[
        CC_CONSTANTS.CC_DATA_QUALITY_GRADES.FAIR
      ].DEFINITION,
    ACTIVITY_DATA_CRITERIA:
      "Historical data on transportation services used, with adjustments for known changes in operations or service provision.",
    EMISSION_FACTOR_CRITERIA:
      "Regional emission factors, somewhat outdated but still commonly used within the logistics industry.",
  },
  [CC_CONSTANTS.CC_DATA_QUALITY_GRADES.BASIC]: {
    DEFINITION:
      CC_CONSTANTS.CC_DATA_QUALITY_INFORMATION[
        CC_CONSTANTS.CC_DATA_QUALITY_GRADES.BASIC
      ].DEFINITION,
    ACTIVITY_DATA_CRITERIA:
      "General allocations for transportation spending, high uncertainty in weight and distance estimations.",
    EMISSION_FACTOR_CRITERIA:
      "Non-specific international emission factors applied without significant adjustment for local transportation practices.",
  },
};
export {
  CC_DATA_QUALITY_INFORMATION_EXAMPLE_1,
  CC_DATA_QUALITY_INFORMATION_EXAMPLE_2,
  CC_DATA_QUALITY_INFORMATION_EXAMPLE_3,
};
