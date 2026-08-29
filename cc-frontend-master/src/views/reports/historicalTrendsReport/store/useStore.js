import { useCallback, useEffect, useState } from "react";
import * as ccReportService from "../../../../services/ccReportService";
import useAPIResponse from "../../../../hooks/apiResponse";
import { useParameters } from "../../../../store/parametersStore";

export default function useStore() {
  let { reportingPeriods } = useParameters();
  const [report, setReport] = useState(null);
  const [isReportLoading, setIsReportLoading] = useState(true); // defaults to true

  const { handleError } = useAPIResponse();

  const loadReport = useCallback(async function (reportingYear) {
    if (!reportingYear) {
      let now = new Date();
      reportingYear = now.getFullYear();
    }
    try {
      setIsReportLoading(true);
      let response = await ccReportService.getHistoricTrendsReport();
      setReport(response?.data?.historicTrendsReport);
    } catch (err) {
      handleError(err);
    } finally {
      setIsReportLoading(false);
    }
  }, []);
  useEffect(() => {
    loadReport();
  }, []);

  return {
    report,
    isReportLoading,
    loadReport,
  };
}
