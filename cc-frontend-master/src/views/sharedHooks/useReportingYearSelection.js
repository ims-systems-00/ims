import { useState } from "react";
import { useParameters } from "../../store/parametersStore";
function getDefaultReportingYear(reportingPeriods) {
  let now = new Date();
  let rp = reportingPeriods.find((rp) => {
    return rp.year === now.getFullYear();
  });
  if (!rp) return null;
  return {
    value: rp.year,
    label: `${rp.startDate} - ${rp.endDate}`,
  };
}
function useReportingYearSelection() {
  const { reportingPeriods } = useParameters();
  const [selectedReportingYear, setSelectedReportingYear] = useState(
    getDefaultReportingYear(reportingPeriods)
  );
  function selectReportingYear(data) {
    setSelectedReportingYear(data);
  }
  return { selectedReportingYear, selectReportingYear };
}
export default useReportingYearSelection;
