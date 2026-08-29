import http from "./httpService";
const apiEndPoint = `/api/${process.env.REACT_APP_API_VERSION}/cc/reports`;

export async function getSingleYearReport({
  reportingYear = null,
  baseYearCompare = false,
}) {
  return http.get(
    apiEndPoint +
      `/single-year-report?reportingYear=${
        reportingYear || ""
      }&baseYearCompare=${baseYearCompare || ""}`
  );
}
export async function getHistoricTrendsReport() {
  return http.get(apiEndPoint + `/historic-trends-report`);
}
export async function getActivitySummaryReport({ query = "" }) {
  return http.get(apiEndPoint + `/activity-summary-report` + "?" + query);
}
export async function getSecrReport({
  reportingYear = null,
  compareYear = null,
}) {
  return http.get(
    apiEndPoint +
      `/secr-report?reportingYear=${reportingYear || ""}&compareYear=${
        compareYear || ""
      }`
  );
}
