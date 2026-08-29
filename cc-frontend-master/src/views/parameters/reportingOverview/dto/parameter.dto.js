import * as yup from "yup";
import CC_CONSTANTS from "../../../../constants";
import moment from "moment/moment";
export const parameterFormValidaionSchema = yup.object({
  reportingStartDate: yup.object({
    date: yup
      .date()
      .min(new Date("2019-01-01"))
      .max(new Date())
      .label("reportingStartDate"),
    label: yup.string().label("reportingStartDate"),
  }),
  baseReportingYear: yup.object({
    label: yup
      .number()
      .oneOf(CC_CONSTANTS.CC_ALLOWED_NET_ZERO_REPORTING_YEARS)
      .label("baseReportingYear"),
    value: yup
      .number()
      .oneOf(CC_CONSTANTS.CC_ALLOWED_NET_ZERO_REPORTING_YEARS)
      .label("baseReportingYear"),
  }),
  currentReportingYear: yup.object({
    label: yup
      .number()
      .oneOf(CC_CONSTANTS.CC_ALLOWED_NET_ZERO_REPORTING_YEARS)
      .label("currentReportingYear"),
    value: yup
      .number()
      .oneOf(CC_CONSTANTS.CC_ALLOWED_NET_ZERO_REPORTING_YEARS)
      .label("currentReportingYear"),
  }),
  primaryReportingMethod: yup.object({
    label: yup
      .string()
      .oneOf(Object.values(CC_CONSTANTS.CC_REPORTING_METHODS))
      .label("primaryReportingMethod"),
    value: yup
      .string()
      .oneOf(Object.values(CC_CONSTANTS.CC_REPORTING_METHODS))
      .label("primaryReportingMethod"),
  }),
  organisationalBoundary: yup.object({
    label: yup
      .string()
      .oneOf(Object.values(CC_CONSTANTS.CC_ORGANISATIONAL_BOUNDARIES))
      .label("primaryReportingMethod"),
    value: yup
      .string()
      .oneOf(Object.values(CC_CONSTANTS.CC_ORGANISATIONAL_BOUNDARIES))
      .label("primaryReportingMethod"),
  }),
  netZeroTargtYear: yup.object({
    label: yup
      .number()
      .oneOf(CC_CONSTANTS.CC_ALLOWED_NET_ZERO_TARGET_YEARS)
      .label("netZeroTargtYear"),
    value: yup
      .number()
      .oneOf(CC_CONSTANTS.CC_ALLOWED_NET_ZERO_TARGET_YEARS)
      .label("netZeroTargtYear"),
  }),
  netZeroReductionPercentageAmbition: yup.object({
    label: yup.number().label("netZeroReductionPercentageAmbition"),
    value: yup.number().label("netZeroReductionPercentageAmbition"),
  }),
});
export function getParameterFormState(apiResponse) {
  return {
    reportingStartDate: {
      date: new Date(apiResponse?.reportingStartDate) || null,
      label: apiResponse?.reportingStartDate
        ? moment(apiResponse?.reportingStartDate).format("DD/MM/YYYY")
        : "",
    },
    baseReportingYear: {
      label: apiResponse?.baseReportingYear || null,
      value: apiResponse?.baseReportingYear || null,
    },
    currentReportingYear: {
      label: apiResponse?.currentReportingYear || null,
      value: apiResponse?.currentReportingYear || null,
    },
    primaryReportingMethod: {
      label: apiResponse?.primaryReportingMethod || null,
      value: apiResponse?.primaryReportingMethod || null,
    },
    organisationalBoundary: {
      label: apiResponse?.organisationalBoundary || null,
      value: apiResponse?.organisationalBoundary || null,
    },
    netZeroTargtYear: {
      label: apiResponse?.netZeroTargtYear || null,
      value: apiResponse?.netZeroTargtYear || null,
    },
    netZeroReductionPercentageAmbition: {
      label: apiResponse?.netZeroReductionPercentageAmbition || null,
      value: apiResponse?.netZeroReductionPercentageAmbition || null,
    },
  };
}
