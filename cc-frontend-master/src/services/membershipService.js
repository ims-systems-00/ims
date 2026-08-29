import http from "./httpService";
const apiEndPoint = `/api/${process.env.REACT_APP_API_VERSION}/memberships`;

export async function listMemberships(options = {}) {
  return http.get(apiEndPoint + `?${options.query ? options.query : ""}`);
}
