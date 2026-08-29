import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import useReportingYearSelection from "../../sharedHooks/useReportingYearSelection";
export default function useStore() {
  const [params] = useSearchParams();
  const { selectedReportingYear, selectReportingYear } =
    useReportingYearSelection();
  useEffect(() => {
    if (params.get("year")) {
    }
  }, [params]);
  return {
    selectedReportingYear,
    selectReportingYear,
  };
}
