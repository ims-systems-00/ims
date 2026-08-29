import * as yup from "yup";
import { numberToBankNumberString, numberToSortCodeString } from "../../../lib";
export const organisationFormValidaionSchema = yup.object({
  name: yup.string().required().label("Name"),
  officeEmail: yup.string().email().required().label("Email"),
  addressCity: yup.string().required().label("City"),
  addressStreet: yup.string().required().label("Street"),
  addressBuilding: yup.string().required().label("Building"),
  addressPostCode: yup.string().required().label("Post code"),
  addressStateProvince: yup.string().required().label("State/Province"),
  contactEmail: yup.string().max(50).email().optional().label("contactEmail"),
  contactName: yup.string().optional().label("contactName"),
  contactPosition: yup.string().optional().label("contactPosition"),
  companyNumber: yup.string().required().label("Company number"),
  vatNumber: yup.string().label("VAT number"),
  bankName: yup.string().required().label("Bank name"),
  sortCode: yup.string().optional().label("Sort code"),
  accountNumber: yup.string().optional().label("Account number"),
  currency: yup.string().optional().label("Account number"),
  amount: yup.number().min(0).label("Mileage"),
});
export function getOrganisationFormState(apiResponse) {
  return {
    name: apiResponse?.name || "",
    officeEmail: apiResponse?.officeEmail || "",
    addressCity: apiResponse?.addressCity || "",
    addressStreet: apiResponse?.addressStreet || "",
    addressBuilding: apiResponse?.addressBuilding || "",
    addressStateProvince: apiResponse?.addressStateProvince || "",
    addressPostCode: apiResponse?.addressPostCode || "",
    companyNumber: apiResponse?.companyNumber || "",
    contactEmail: apiResponse?.contactEmail || "",
    contactName: apiResponse?.contactName || "",
    contactPosition: apiResponse?.contactPosition || "",
    vatNumber: apiResponse?.vatNumber || "",
    bankName: apiResponse?.bankDetails.name || "",
    sortCode: numberToSortCodeString(
      apiResponse?.bankDetails.sortCode?.toString() || ""
    ),
    accountNumber: numberToBankNumberString(
      apiResponse?.bankDetails.accountNo?.toString() || ""
    ),
    amount: apiResponse?.millageCostForUsers?.amount || 0,
    currency: apiResponse?.countryCurrency || "",
  };
}
