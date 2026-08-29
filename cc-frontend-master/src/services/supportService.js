import http from "./httpService";
const apiEndPoint = `/api/${process.env.REACT_APP_API_VERSION}/jira-integration`;
export function createSupportRequest(data) {
  return http.post(apiEndPoint, data);
}
