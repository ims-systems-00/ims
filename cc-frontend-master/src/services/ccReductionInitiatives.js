import http from "./httpService";
const apiEndPoint = `/api/${process.env.REACT_APP_API_VERSION}/cc/initiatives`;

export async function createInitiative(data) {
  return http.post(apiEndPoint, {
    ...data,
  });
}
export async function listInitiatives({ query = "" }) {
  return http.get(apiEndPoint + "?" + query);
}
export async function getInitiative(id) {
  return http.get(apiEndPoint + `/${id}`);
}
export async function updateInitiative(id, data) {
  return http.put(apiEndPoint + `/${id}`, { ...data });
}
export async function deleteInitiative(id) {
  return http.delete(apiEndPoint + `/${id}/hard`);
}
