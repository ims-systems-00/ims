import http from "./httpService";
const apiEndPoint = `/api/${process.env.REACT_APP_API_VERSION}/cc/defra-factors`;

export async function listDefraFactors({ query = "" }) {
  return http.get(apiEndPoint + "?" + query);
}
