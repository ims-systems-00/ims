import { useCallback, useState } from "react";
import CC_CONSTANTS from "../../../../constants";
import * as ccParameterService from "../../../../services/ccParameterService";
import { useParameters } from "../../../../store/parametersStore";
import { useNavigate } from "react-router-dom";
import useAPIResponse from "../../../../hooks/apiResponse";
export default function useStore() {
  const { loadParameter } = useParameters(null);
  const [isCreating, setIsCreating] = useState(false); // defaults to
  const navigate = useNavigate();
  const { handleError, handleSuccess } = useAPIResponse();
  const createParameter = useCallback(async function () {
    try {
      setIsCreating(true);
      const today = new Date();
      let response = await ccParameterService.createParameter({
        reportingStartDate: today,
        baseReportingYear:
          CC_CONSTANTS.CC_ALLOWED_NET_ZERO_REPORTING_YEARS.find(
            (y) => y === today.getFullYear()
          ),
        currentReportingYear:
          CC_CONSTANTS.CC_ALLOWED_NET_ZERO_REPORTING_YEARS.find(
            (y) => y === today.getFullYear()
          ),
        primaryReportingMethod:
          CC_CONSTANTS.CC_REPORTING_METHODS.LOCATTION_BASED,
        organisationalBoundary:
          CC_CONSTANTS.CC_ORGANISATIONAL_BOUNDARIES.OPERATIONAL_CONTROL,
        netZeroTargtYear:
          CC_CONSTANTS.CC_ALLOWED_NET_ZERO_REPORTING_YEARS[
            CC_CONSTANTS.CC_ALLOWED_NET_ZERO_REPORTING_YEARS.length - 1
          ],
        netZeroReductionPercentageAmbition: 85,
      });
      handleSuccess(response);
      await loadParameter();
      navigate("/parameters/configuration");
    } catch (err) {
      handleError(err);
    } finally {
      setIsCreating(false);
    }
  }, []);
  return {
    isCreating,
    createParameter,
  };
}
