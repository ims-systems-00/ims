import { useCallback, useEffect, useState } from "react";
import * as ccParameterService from "../../services/ccParameterService";
import useAPIResponse from "../../hooks/apiResponse";
import moment from "moment";
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

export default function useStore() {
  const [parameter, setParameter] = useState(null);
  const [isParameterLoading, setIsParameterLoading] = useState(true); // defaults to true
  const { handleError } = useAPIResponse();
  const [selectedReportingYear, setSelectedReportingYear] = useState(
    getDefaultReportingYear([])
  );
  function selectReportingYear(data) {
    setSelectedReportingYear(data);
  }
  const loadParameter = useCallback(async function () {
    try {
      setIsParameterLoading(true);
      let response = await ccParameterService.listParameters();
      setParameter(response?.data?.ccParameters[0] || null);
    } catch (err) {
      handleError(err);
    } finally {
      setIsParameterLoading(false);
    }
  }, []);
  useEffect(() => {
    loadParameter();
  }, []);
  let getReportingPeriods = useCallback(function (parameter) {
    let baseStartDateConfig = new Date(parameter?.reportingStartDate);
    let baseEndDateConfig = new Date(parameter?.reportingStartDate);
    baseEndDateConfig.setDate(baseStartDateConfig.getDate() - 1);
    let today = new Date();
    if (parameter) {
      return parameter?.reportingYears
        ?.filter((yearData) => {
          // we are keeping the date table within the range of starting year and current year for good UX.
          return (
            yearData.year >= baseStartDateConfig.getFullYear() &&
            yearData.year <= today.getFullYear()
          );
        })
        .map((yearData) => {
          let NEXT_YEAR_FACTOR = 1;
          let startDate = new Date(baseStartDateConfig);
          startDate.setFullYear(yearData.year);
          let endDate = new Date(baseEndDateConfig);
          if (startDate.getMonth() === 0 && startDate.getDate() === 1)
            NEXT_YEAR_FACTOR = 0;
          endDate.setFullYear(yearData.year + NEXT_YEAR_FACTOR);
          const reportingYear = yearData.year;
          // yearData.year +
          // NEXT_YEAR_FACTOR -
          // parameter?.emissionFactorDBYearCountFactor;
          return {
            yearId: yearData._id,
            parameterId: parameter?._id,
            year: reportingYear,
            startDate: moment(startDate).format("DD/MM/YYYY"),
            endDate: moment(endDate).format("DD/MM/YYYY"),
            period:
              moment(startDate).format("DD/MM/YYYY") +
              " - " +
              moment(endDate).format("DD/MM/YYYY"),
            emissionFactorDbYear: reportingYear - parameter?.emissionFactorDBYearCountFactor,
            turnOver: yearData.turnOver,
            employeeCount: yearData.employeeCount,
          };
        });
    } else return [];
  }, []);
  return {
    parameter,
    selectedReportingYear,
    selectReportingYear,
    reportingPeriods: getReportingPeriods(parameter),
    isParameterLoading,
    loadParameter,
  };
}
