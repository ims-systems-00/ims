import * as yup from "yup";
import CC_CONSTANTS from "../../../../constants";
export const categroyCalculationFormValidaionSchema = yup.object({
  reportingYear: yup.object({
    label: yup.string().required().label("reportingYear"),
    value: yup.string().required().label("reportingYear"),
  }),
  reportingMonth: yup.object({
    label: yup.string().required().label("reportingMonth"),
    value: yup.string().required().label("reportingMonth"),
  }),
  calculationMethod: yup.object({
    label: yup.string().required().label("calculationMethod"),
    value: yup.string().required().label("calculationMethod"),
  }),
  activity: yup.object({
    label: yup.string().when("$calculationMethod", {
      is: (calculationMethod) => {
        return (
          calculationMethod &&
          [
            CC_CONSTANTS.CC_CALCULATION_METHODS.CUSTOM,
            CC_CONSTANTS.CC_CALCULATION_METHODS.SUPPLIER_SPECIFIC_METHOD,
            CC_CONSTANTS.CC_CALCULATION_METHODS.MARKET_BASED_METHOD,
          ].includes(calculationMethod.value)
        );
      },
      then: () => yup.string().optional().nullable().label("activity"),
      otherwise: () => yup.string().required().label("activity"),
    }),
    value: yup.string().when("$calculationMethod", {
      is: (calculationMethod) => {
        return (
          calculationMethod &&
          [
            CC_CONSTANTS.CC_CALCULATION_METHODS.CUSTOM,
            CC_CONSTANTS.CC_CALCULATION_METHODS.SUPPLIER_SPECIFIC_METHOD,
            CC_CONSTANTS.CC_CALCULATION_METHODS.MARKET_BASED_METHOD,
          ].includes(calculationMethod.value)
        );
      },
      then: () => yup.string().optional().nullable().label("activity"),
      otherwise: () => yup.string().required().label("activity"),
    }),
  }),
  unit: yup.object({
    label: yup.string().when("$calculationMethod", {
      is: (calculationMethod) => {
        return (
          calculationMethod &&
          [
            CC_CONSTANTS.CC_CALCULATION_METHODS.CUSTOM,
            CC_CONSTANTS.CC_CALCULATION_METHODS.SUPPLIER_SPECIFIC_METHOD,
            CC_CONSTANTS.CC_CALCULATION_METHODS.MARKET_BASED_METHOD,
          ].includes(calculationMethod.value)
        );
      },
      then: () => yup.string().optional().nullable().label("unit"),
      otherwise: () => yup.string().required().label("unit"),
    }),
    value: yup.string().when("$calculationMethod", {
      is: (calculationMethod) => {
        return (
          calculationMethod &&
          [
            CC_CONSTANTS.CC_CALCULATION_METHODS.CUSTOM,
            CC_CONSTANTS.CC_CALCULATION_METHODS.SUPPLIER_SPECIFIC_METHOD,
            CC_CONSTANTS.CC_CALCULATION_METHODS.MARKET_BASED_METHOD,
          ].includes(calculationMethod.value)
        );
      },
      then: () => yup.string().optional().nullable().label("unit"),
      otherwise: () => yup.string().required().label("unit"),
    }),
  }),
  customFactorId: yup.object({
    label: yup.string().optional().nullable().label("customFactorId"),
    value: yup.string().optional().nullable().label("customFactorId"),
  }),
  amount: yup.number().min(0).required().label("unit"),
  customReference: yup.string().optional().label("customReference"),
  location: yup.object({
    label: yup.string().nullable().optional().label("location"),
    value: yup.string().nullable().optional().label("value"),
  }),
  supplierName: yup.string().label("supplierName"),
  meterNumber: yup.string().label("meterNumber"),
  invoiceNumber: yup.string().label("invoiceNumber"),
  activityDataGrade: yup.object({
    label: yup
      .string()
      .oneOf(Object.values(CC_CONSTANTS.CC_DATA_QUALITY_GRADES))
      .label("grade"),
    value: yup
      .string()
      .oneOf(Object.values(CC_CONSTANTS.CC_DATA_QUALITY_GRADES))
      .label("grade"),
  }),
});
export function isCustomCalculationMethod(calculationMethod) {
  return [
    CC_CONSTANTS.CC_CALCULATION_METHODS.CUSTOM,
    CC_CONSTANTS.CC_CALCULATION_METHODS.SUPPLIER_SPECIFIC_METHOD,
    CC_CONSTANTS.CC_CALCULATION_METHODS.MARKET_BASED_METHOD,
  ].includes(calculationMethod);
}

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
export function getCategoryCalculationFormState(apiResponse) {
  return {
    reportingYear: {
      value: apiResponse?.reportingYear || "",
      label: apiResponse?.reportingYear || "",
    },
    reportingMonth: {
      value: apiResponse?.reportingMonth || "",
      label: apiResponse?.reportingMonth || "",
    },
    calculationMethod: {
      value: apiResponse?.calculationMethod || "",
      label: apiResponse?.calculationMethod || "",
    },
    activity: {
      value: apiResponse?.activity || "",
      label: apiResponse?.activity || "",
    },
    unit: {
      value: apiResponse?.unit || "",
      label: apiResponse?.unit || "",
    },
    customFactorId: {
      value: apiResponse?.customFactorId?._id || null,
      label: apiResponse?.customFactorId
        ? `${apiResponse?.customFactorId?.reference}:- ${apiResponse?.customFactorId?.combinedActivityReference}. Factor:- ${apiResponse?.customFactorId?.ghgConversionFactor} KG CO2e/${apiResponse?.customFactorId?.uom}`
        : "",
    },
    location: {
      value: apiResponse?.location?._id || null,
      label: apiResponse?.location?.address || "",
    },
    amount: apiResponse?.amount || 0,
    customReference: apiResponse?.customReference || "",
    supplierName: apiResponse?.supplierName || "",
    meterNumber: apiResponse?.meterNumber || "",
    invoiceNumber: apiResponse?.invoiceNumber || "",
    activityDataGrade: {
      value: apiResponse?.activityDataGrade || "",
      label: apiResponse?.activityDataGrade || "",
    },
  };
}
export const MONTH_FULL_NAMES = {
  Annual: "Annual",
  Jan: "January",
  Feb: "February",
  Mar: "March",
  Apr: "April",
  May: "May",
  Jun: "June",
  Jul: "July",
  Aug: "August",
  Sep: "September",
  Oct: "October",
  Nov: "November",
  Dec: "December",
};
