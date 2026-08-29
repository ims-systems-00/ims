import { useCallback, useEffect, useState } from "react";
import useAPIResponse from "../../../../hooks/apiResponse";
import * as ccReportService from "../../../../services/ccReportService";

export default function useStore() {
  const [secrReport, setSecrReport] = useState(null);
  const [isSecrReportLoading, setIsSecrReportLoading] = useState(true);
  const { handleError } = useAPIResponse();

  const [reportingYear, setReportingYear] = useState({
    value: 2024,
    label: "2024",
  });
  const [compareYear, setCompareYear] = useState({
    value: 2023,
    label: "2023",
  });

  const loadSecrReport = useCallback(async function ({
    reportingYear,
    compareYear,
  }) {
    try {
      setIsSecrReportLoading(true);
      const response = await ccReportService.getSecrReport({
        reportingYear: reportingYear || 2024,
        compareYear: compareYear || 2023,
      });
      setSecrReport(response?.data?.secrReport || null);
    } catch (err) {
      console.error("Error fetching SECR report:", err);
      handleError(err);
    } finally {
      setIsSecrReportLoading(false);
    }
  },
  []);

  useEffect(() => {
    const today = new Date();
    const reportingYearValue = reportingYear.value || today.getFullYear();
    const compareYearValue = compareYear.value || today.getFullYear() - 1;
    loadSecrReport({
      reportingYear: reportingYearValue,
      compareYear: compareYearValue,
    });
  }, [reportingYear, compareYear]);

  return {
    secrReport,
    isSecrReportLoading,
    reportingYear,
    compareYear,
    setReportingYear,
    setCompareYear,
    loadSecrReport,
  };
}
