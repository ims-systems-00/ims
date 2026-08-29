import http from "./httpService";
const apiEndPoint = `/api/${process.env.REACT_APP_API_VERSION}/cc/locations`;

export async function createLocation(data) {
  return http.post(apiEndPoint, {
    ...data,
  });
}
export async function listLocations(options = {}) {
  return http.get(apiEndPoint + `?${options.query ? options.query : ""}`);
}
export async function getLocation(id) {
  return http.get(apiEndPoint + `/${id}`);
}
export async function updateLocation(id, data) {
  return http.put(apiEndPoint + `/${id}`, { ...data });
}
export async function deleteLocation(id) {
  return http.delete(apiEndPoint + `/${id}/hard`);
}
