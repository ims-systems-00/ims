import moment from "moment";
import {
  decimalStringToNumber,
  numberToBankNumberString,
  numberToSortCodeString,
} from "../lib";
import http from "./httpService";
const organisationKey = "organisation";
const partnerCodeKey = "partnercode";

const apiEndPoint = `/api/${process.env.REACT_APP_API_VERSION}/organizations`;

export function createOrganisation(org) {
  return http.post(`${apiEndPoint}/`, {
    name: org.name,
    address: org.address,
    officeEmail: org.officeEmail,
    contactNumber: org.contactNumber,
    vatNumber: org.vatNumber,
    sizeOfOrg: org.sizeOfOrg,
    industry: org.industry.value,
    addressCity: org.addressCity,
    addressStreet: org.addressStreet,
    addressBuilding: org.addressBuilding,
    addressPostCode: org.addressPostCode,
    addressStateProvince: org.addressStateProvince,
    countryName: org.countryName?.value,
    countryAbbr: org.countryAbbr,
    countryCurrency: org.countryCurrency,
    countryPhonecode: 44,
    logometadata: org.logometadata || null,
    referralSource: org.referralSource || null,
  });
}
export function goLive(id, data) {
  return http.post(`${apiEndPoint}/${id}/go-live`, {
    paymentType: data.paymentType,
    users: data.users,
    groups: data.groups,
    superUser: data.superUser,
    complianceTools: data.complianceTools,
    additionalModules: data.additionalModules,
  });
}

export function getOrganizations({ query }) {
  return http.get(`${apiEndPoint}/?` + query || "");
}
export function getUsersByOrganization(id) {
  return http.get(`${apiEndPoint}/${id}/users`);
}
export function getOrganization(id) {
  return http.get(`${apiEndPoint}/` + id);
}
export function getCardpaymentSession(id) {
  return http.get(`${apiEndPoint}/${id}/card-payment-session`);
}
export function getBillingSession(id) {
  return http.get(`${apiEndPoint}/${id}/billing-session`);
}
export function updateOrganisation(orgId, org) {
  return http.put(`${apiEndPoint}/${orgId}`, {
    name: org.name,
    addressCity: org.addressCity,
    addressStreet: org.addressStreet,
    addressBuilding: org.addressBuilding,
    addressPostCode: org.addressPostCode,
    addressStateProvince: org.addressStateProvince,
    countryName: org.country,
    countryAbbr: "UK",
    countryCurrency: "GBP",
    countryPhonecode: 44,
    officeEmail: org.officeEmail,
    companyNumber: org.companyNumber,
    contactEmail: org?.contactEmail || undefined,
    contactName: org?.contactName || undefined,
    contactPosition: org?.contactPosition || undefined,
    vatNumber: org.vatNumber,
    typeOfBusiness: org.typeOfBusiness,
    bankDetails: {
      name: org.bankName,
      sortCode: decimalStringToNumber(org.sortCode),
      accountNo: decimalStringToNumber(org.accountNumber),
    },
    millageCostForUsers: {
      amount: org.amount,
      currency: org.currency,
    },
  });
}

export function changeOrganisationLogo(id, data) {
  return http.put(`${apiEndPoint}/${id}/logo/`, {
    logometadata: data.logometadata,
  });
}

export function getLicenses(id) {
  return http.get(`${apiEndPoint}/${id}/licenses/`);
}

export function refreshOrganisationCache(data) {
  localStorage.setItem(organisationKey, data);
}
export function getOrganisationCache() {
  return localStorage.getItem(organisationKey);
}
export function getOrganisationData() {
  return JSON.parse(localStorage.getItem(organisationKey));
}

export function removeOrganisationCache() {
  localStorage.removeItem(organisationKey);
}
export function cacheParnterCode(code) {
  localStorage.setItem(partnerCodeKey, code);
}
export function getCachedParnterCode() {
  return localStorage.getItem(partnerCodeKey);
}
export function removeCachedParnterCode() {
  localStorage.removeItem(partnerCodeKey);
}
export function updateIncidentResolution(orgId, resolution) {
  return http.put(`${apiEndPoint}/${orgId}/incident-resolutiontime/`, {
    p1incidentResolutionTime: resolution.p1incidentResolutionTime,
    p2incidentResolutionTime: resolution.p2incidentResolutionTime,
    p3incidentResolutionTime: resolution.p3incidentResolutionTime,
    p4incidentResolutionTime: resolution.p4incidentResolutionTime,
  });
}
export function getIncidentResolution() {
  return http.get(`${apiEndPoint}/incident-resolutiontime/`);
}
export function mapToIncidentResolutionTime(organisation) {
  return {
    data: {
      p1incidentResolutionTime: organisation.p1incidentResolutionTime,
      p2incidentResolutionTime: organisation.p2incidentResolutionTime,
      p3incidentResolutionTime: organisation.p3incidentResolutionTime,
      p4incidentResolutionTime: organisation.p4incidentResolutionTime,
    },
    errors: {},
  };
}
export function getSystemDates() {
  return http.get(`${apiEndPoint}/system-dates/`);
}
export function setSystemDates(orgId, data) {
  console.log("organizationService", data);
  return http.put(`${apiEndPoint}/${orgId}/system-dates/`, {
    start: new Date(
      moment(data.start, "DD/MM/YYYY").toString().split("GMT")[0]
    ),
    end: new Date(moment(data.end, "DD/MM/YYYY").toString().split("GMT")[0]),
  });
}
export function mapToSystemDates(organisation) {
  return {
    data: {
      start: moment(organisation.systemDate.start).format("D/M/Y"),
      end: moment(organisation.systemDate.end).format("D/M/Y"),
    },
    errors: {},
  };
}
export function getReportSubscriber(orgId, { query }) {
  return http.get(`${apiEndPoint}/${orgId}/report-subscriptions/?${query}`);
}
export function addReportSubscriber(orgId, data) {
  return http.post(`${apiEndPoint}/${orgId}/report-subscriptions/`, {
    name: data.name,
    email: data.email,
    interval: data.interval.value,
    issueDate: new Date(
      moment(data.date, "DD/MM/YYYY").toString().split("GMT")[0]
    ),
  });
}
export function deleteReportSubscriber(orgId, subscriberId) {
  return http.delete(
    `${apiEndPoint}/${orgId}/report-subscriptions/${subscriberId}`
  );
}

export function mapToOrganisationModel(org) {
  return {
    data: {
      name: org.name,
      officeEmail: org.officeEmail,
      addressCity: org.addressCity,
      addressStreet: org.addressStreet,
      addressBuilding: org.addressBuilding,
      addressBuilding: org.addressBuilding,
      addressStateProvince: org.addressStateProvince,
      addressPostCode: org.addressPostCode,
      companyNumber: org.companyNumber,
      vatNumber: org.vatNumber,
      bankName: org.bankDetails.name,
      sortCode: numberToSortCodeString(org.bankDetails.sortCode?.toString()),
      accountNumber: numberToBankNumberString(
        org.bankDetails.accountNo?.toString()
      ),
      amount: org.millageCostForUsers.amount,
      currency: {
        value: org.countryCurrency,
        label: org.countryCurrency,
      },
    },
    errors: {},
  };
}
