import { useCallback, useEffect, useState } from "react";
import * as ccReportService from "../../services/ccReportService";
import useAPIResponse from "../../hooks/apiResponse";
import {
  useBuildQueryString,
  usePaginationState,
} from "@ims-systems-00/ims-react-hooks";

let now = new Date();
let currentReportingYear = now.getFullYear();
const defaultConfig = { reportingYear: currentReportingYear, category: null };
export default function useActivitySummaryByCategory(
  initialConfig = defaultConfig
) {
  const [report, setReport] = useState([]);
  const [isReportLoading, setIsReportLoading] = useState(true); // defaults to true
  const { pagination, updatePaginaion } = usePaginationState();
  const { getQueryString, query, toolState, handleFilter, handlePagination } =
    useBuildQueryString({
      filter: {
        value: {
          reportingYear:
            initialConfig.reportingYear || defaultConfig.reportingYear,
          category: initialConfig.category || defaultConfig.category,
        },
      },
      pagination: {
        page: 1,
        size: 100,
      },
    });

  const { handleError } = useAPIResponse();
  const loadReport = useCallback(async function (query = "") {
    let response = null;
    try {
      setIsReportLoading(true);
      response = await ccReportService.getActivitySummaryReport({
        query,
      });
      updatePaginaion(response?.data?.pagination);
    } catch (err) {
      handleError(err);
    } finally {
      setIsReportLoading(false);
      return response;
    }
  }, []);
  async function loadAndMuteExitingSummary(query = "") {
    const response = await loadReport(query);
    if (response?.data?.activitySummary)
      setReport(response?.data?.activitySummary);
  }
  async function loadAndAppendToExitingSummary(query = "") {
    const response = await loadReport(query);
    if (response?.data?.activitySummary)
      setReport((prevData) => [
        ...prevData,
        ...response?.data?.activitySummary,
      ]);
  }
  function selectReportingYear(data) {
    handleFilter({ value: { ...toolState.filter.value, reportingYear: data } });
    handlePagination(1, 100);
  }
  function selectCategory(data) {
    handleFilter({ value: { ...toolState.filter.value, category: data } });
    handlePagination(1, 100);
  }
  function hasMoreActivities() {
    return pagination.hasNextPage;
  }
  useEffect(() => {
    if (toolState.pagination?.page === 1)
      loadAndMuteExitingSummary(getQueryString());
    else loadAndAppendToExitingSummary(getQueryString());
  }, [query]);
  useEffect(() => {
    if (initialConfig.reportingYear)
      selectReportingYear(initialConfig.reportingYear);
  }, [initialConfig.reportingYear]);
  return {
    report,
    isReportLoading,
    selectedReportingYear: toolState.filter.value?.reportingYear,
    selectedCategory: toolState.filter.value?.category,
    selectReportingYear,
    selectCategory,
    pagination,
    handlePagination,
    loadAndAppendToExitingSummary,
    loadAndMuteExitingSummary,
  };
}
