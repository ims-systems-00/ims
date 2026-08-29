import http from "./httpService";
const apiEndPoint = `/api/${process.env.REACT_APP_API_VERSION}/cc/parameters`;

export async function createParameter(data) {
  return http.post(apiEndPoint, {
    ...data,
  });
}
export async function listParameters() {
  return http.get(apiEndPoint);
}
export async function getParameter(id) {
  return http.get(apiEndPoint + `/${id}`);
}
export async function updateParameter(id, data) {
  return http.put(apiEndPoint + `/${id}`, { ...data });
}
export async function deleteParameter(id) {
  return http.delete(apiEndPoint + `/${id}`);
}
export async function listReportingBoundaries(id) {
  return http.get(apiEndPoint + `/${id}/reporting-boundaries`);
}
export async function updateReportingBoundary(id, boundaryId, data) {
  return http.put(apiEndPoint + `/${id}/reporting-boundaries/${boundaryId}`, {
    ...data,
  });
}
export async function listReportingYears(id) {
  return http.get(apiEndPoint + `/${id}/reporting-years`);
}
export async function updateReportingYear(id, yearId, data) {
  return http.put(apiEndPoint + `/${id}/reporting-years/${yearId}`, {
    ...data,
  });
}
