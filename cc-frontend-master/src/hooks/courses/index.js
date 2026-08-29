import { useAddLocationOrSites } from "./useAddLocationOrSites";
import { useCalculationsForm } from "./useCalculationsForm";
import { useConfigureCarbonCalculator } from "./useConfigureCarbonCalculator";
import { useCustomFactor } from "./useCustomFactor";
import { useDashboard } from "./useDashboard";
import { useFindReports } from "./useFindReports";
import { useImportData } from "./useImportData";
import { useReductionPlan } from "./useReductionPlan";
import { useReportingPeriods } from "./useReportingPeriods";

const useCourses = () => {
  return {
    dashboard: useDashboard(),
    configureCarbonCalculator: useConfigureCarbonCalculator(),
    reportingPeriods: useReportingPeriods(),
    addLocationOrSites: useAddLocationOrSites(),
    importData: useImportData(),
    calculationsForm: useCalculationsForm(),
    customFactor: useCustomFactor(),
    findReports: useFindReports(),
    reductionPlan: useReductionPlan(),
  };
};

export default useCourses;
