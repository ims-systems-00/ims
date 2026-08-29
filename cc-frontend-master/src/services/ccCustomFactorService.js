import http from "./httpService";
const apiEndPoint = `/api/${process.env.REACT_APP_API_VERSION}/cc/custom-factors`;

export async function createCustomFactor(data) {
  return http.post(apiEndPoint, {
    ...data,
  });
}
export async function listCustomFactors({ query = "" }) {
  return http.get(apiEndPoint + "?" + query);
}
export async function getCustomFactor(id) {
  return http.get(apiEndPoint + `/${id}`);
}
export async function updateCustomFactor(id, data) {
  return http.put(apiEndPoint + `/${id}`, { ...data });
}
export async function deleteCustomFactor(id) {
  return http.delete(apiEndPoint + `/${id}/hard`);
}
