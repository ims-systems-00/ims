import { useCallback } from "react";
import useAPIResponse from "../../../hooks/apiResponse";
import * as supportService from "../../../services/supportService";
export const useCreateSupportRequest = () => {
  const { handleSuccess, handleError } = useAPIResponse();
  const createSupportRequest = useCallback(async (data) => {
    try {
      const response = await supportService.createSupportRequest(data);
      handleSuccess(response.data);
    } catch (error) {
      handleError(error);
    }
  }, []);
  return { createSupportRequest };
};
