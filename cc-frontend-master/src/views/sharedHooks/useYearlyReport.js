import { useCallback, useEffect, useState } from "react";
import * as ccReportService from "../../services/ccReportService";
import useAPIResponse from "../../hooks/apiResponse";
import { useParameters } from "../../store/parametersStore";
import useReportingYearSelection from "./useReportingYearSelection";

export default function useYearlyReport() {
  const [report, setReport] = useState(null);
  const [reportBaseYear, setReportBaseYear] = useState(null);
  const [isReportLoading, setIsReportLoading] = useState(true); // defaults to true
  const { selectedReportingYear, selectReportingYear } =
    useReportingYearSelection();
  const { handleError } = useAPIResponse();

  const loadReport = useCallback(async function (reportingYear) {
    if (!reportingYear) {
      let now = new Date();
      reportingYear = now.getFullYear();
    }
    try {
      setIsReportLoading(true);
      let response = await ccReportService.getSingleYearReport({
        reportingYear,
        baseYearCompare: true,
      });
      setReport(response?.data?.singleYearReport);
      setReportBaseYear(response?.data?.baseYearReport);
    } catch (err) {
      handleError(err);
    } finally {
      setIsReportLoading(false);
    }
  }, []);
  useEffect(() => {
    loadReport(selectedReportingYear?.year);
  }, [selectedReportingYear]);

  return {
    report,
    reportBaseYear,
    isReportLoading,
    selectedReportingYear,
    selectReportingYear,
    loadReport,
  };
}
