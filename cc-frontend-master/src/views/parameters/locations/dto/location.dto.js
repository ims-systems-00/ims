import * as yup from "yup";
import CC_CONSTANTS from "../../../../constants";
import moment from "moment/moment";
export const locationFormValidaionSchema = yup.object({
  locationRef: yup.string().required().label("locationRef"),
  addressInMap: yup.object({
    label: yup.string().nullable().label("address"),
    value: yup.string().nullable().label("address"),
  }),
  addressBuilding: yup.string().optional().label("addressBuilding"),
  addressStreet: yup.string().optional().label("addressStreet"),
  addressCity: yup.string().optional().label("addressCity"),
  addressPostCode: yup.string().optional().label("addressPostCode"),
  addressStateProvince: yup.string().optional().label("addressStateProvince"),
  addressCountry: yup.string().optional().label("addressCountry"),
  descriptionOfActivities: yup.string().optional().label("locationRef"),
  ghgAssessmentInclusion: yup.object({
    label: yup
      .string()
      .oneOf(Object.values(CC_CONSTANTS.CC_GHG_INCLUSION_ASSESSMENT))
      .label("ghgAssessmentInclusion"),
    value: yup
      .string()
      .oneOf(Object.values(CC_CONSTANTS.CC_GHG_INCLUSION_ASSESSMENT))
      .label("ghgAssessmentInclusion"),
  }),
  comment: yup.string().optional().label("locationRef"),
});
export function getLocationFormState(apiResponse) {
  return {
    locationRef: apiResponse?.locationRef || "",
    addressInMap: {
      label: apiResponse?.addressInMap || null,
      value: apiResponse?.addressInMap || null,
    },
    addressBuilding: apiResponse?.addressBuilding || "",
    addressStreet: apiResponse?.addressStreet || "",
    addressCity: apiResponse?.addressCity || "",
    addressPostCode: apiResponse?.addressPostCode || "",
    addressStateProvince: apiResponse?.addressStateProvince || "",
    addressCountry: apiResponse?.addressCountry || "",
    descriptionOfActivities: apiResponse?.descriptionOfActivities || "",
    ghgAssessmentInclusion: {
      label: apiResponse?.ghgAssessmentInclusion || null,
      value: apiResponse?.ghgAssessmentInclusion || null,
    },
    comment: apiResponse?.comment || "",
  };
}
