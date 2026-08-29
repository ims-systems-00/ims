import * as yup from "yup";
import CC_CONSTANTS from "../../../../constants";
export const customFactorFormValidaionSchema = yup.object({
  combinedActivityReference: yup
    .string()
    .required()
    .label("combinedActivityReference"),
  uom: yup.string().required().label("uom"),
  ghgPerUnit: yup.string().optional().oneOf(["co2e"]).label("ghgPerUnit"),
  ghgConversionFactor: yup
    .number()
    .required()
    .min(0)
    .label("ghgConversionFactor"),
  purchasedElectricityCoal: yup
    .number()
    .optional()
    .min(0)
    .label("purchasedElectricityCoal"),
  purchasedElectricityNaturalGas: yup
    .number()
    .optional()
    .min(0)
    .max(100)
    .label("purchasedElectricityNaturalGas"),
  purchasedElectricityNuclear: yup
    .number()
    .optional()
    .min(0)
    .max(100)
    .label("purchasedElectricityNuclear"),
  purchasedElectricityRenewables: yup
    .number()
    .optional()
    .min(0)
    .max(100)
    .label("purchasedElectricityRenewables"),
  purchasedElectricityOther: yup
    .number()
    .optional()
    .min(0)
    .max(100)
    .label("purchasedElectricityOther"),
  source: yup.string().required().label("source"),
  sourceLink: yup.string().required().label("sourceLink"),
  sourceNotes: yup.string().optional().label("sourceNotes"),
  grade: yup.object({
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

export function getCustomFactorFormState(apiResponse) {
  return {
    combinedActivityReference: apiResponse?.combinedActivityReference || "",
    uom: apiResponse?.uom || "",
    ghgPerUnit: apiResponse?.ghgPerUnit || "co2e",
    ghgConversionFactor: apiResponse?.ghgConversionFactor || 0,
    purchasedElectricityCoal: apiResponse?.purchasedElectricityCoal || 0,
    purchasedElectricityNaturalGas:
      apiResponse?.purchasedElectricityNaturalGas || 0,
    purchasedElectricityNuclear: apiResponse?.purchasedElectricityNuclear || 0,
    purchasedElectricityRenewables:
      apiResponse?.purchasedElectricityRenewables || 0,
    purchasedElectricityOther: apiResponse?.purchasedElectricityOther || 0,
    source: apiResponse?.source || "",
    sourceLink: apiResponse?.sourceLink || "",
    sourceNotes: apiResponse?.sourceNotes || "",
    neroNotes: apiResponse?.neroNotes || "",
    grade: {
      value: apiResponse?.grade || "",
      label: apiResponse?.grade || "",
    },
  };
}
