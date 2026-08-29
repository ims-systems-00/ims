import http from "./httpService";
const apiEndPoint = `/api/${process.env.REACT_APP_API_VERSION}/cc/calculations`;

export async function createCalculation(data) {
  return http.post(apiEndPoint, {
    ...data,
  });
}
export async function listCalculations({ query = "" }) {
  return http.get(apiEndPoint + "?" + query);
}
export async function getCalculation(id) {
  return http.get(apiEndPoint + `/${id}`);
}
export async function updateCalculation(id, data) {
  return http.put(apiEndPoint + `/${id}`, { ...data });
}
export async function deleteCalculation(id) {
  return http.delete(apiEndPoint + `/${id}/hard`);
}
