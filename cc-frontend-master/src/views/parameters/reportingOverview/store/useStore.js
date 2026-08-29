import { useCallback } from "react";
import * as ccParameterService from "../../../../services/ccParameterService";
import { useParameters } from "../../../../store/parametersStore";
import useAPIResponse from "../../../../hooks/apiResponse";
export default function useStore() {
  const { loadParameter } = useParameters();
  const { handleSuccess, handleError } = useAPIResponse();
  const updateParameter = useCallback(async function (id, updates) {
    try {
      let reponse = await ccParameterService.updateParameter(id, updates);
      handleSuccess(reponse);
      await loadParameter();
    } catch (err) {
      handleError(err);
    }
  }, []);
  return {
    updateParameter,
  };
}
