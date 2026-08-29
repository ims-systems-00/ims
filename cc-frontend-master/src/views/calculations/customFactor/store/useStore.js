import { useEffect, useState } from "react";
import * as ccCustomFactorService from "../../../../services/ccCustomFactorService";
import CC_CONSTANTS from "../../../../constants";
import { useCategory } from "../../stores/categoryStore";
import useAPIResponse from "../../../../hooks/apiResponse";
import {
  useBuildQueryString,
  usePaginationState,
} from "@ims-systems-00/ims-react-hooks";
export default function useStore({}) {
  const [viewingCustomFactor, setViewingCustomFactor] = useState(null);
  const [customFactors, setCustomFactors] = useState([]);
  const { category } = useCategory();
  const { handleSuccess, handleError } = useAPIResponse();
  const { pagination, updatePaginaion } = usePaginationState();
  const queryHandler = useBuildQueryString({
    filter: {
      value: { category },
    },
  });
  async function listCustomFactors(query) {
    try {
      const response = await ccCustomFactorService.listCustomFactors({
        query: query,
      });
      setCustomFactors(response?.data?.ccCustomFactors);
      updatePaginaion(response?.data?.pagination);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  function viewCustomFactor(l) {
    setViewingCustomFactor(l);
  }
  async function createCustomFactor(payload) {
    try {
      const response = await ccCustomFactorService.createCustomFactor(payload);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function createCustomFactorWithEmptyData() {
    return createCustomFactor({
      locationRef: "",
      address: "",
      descriptionOfActivities: "",
      ghgAssessmentInclusion: CC_CONSTANTS.CC_GHG_INCLUSION_ASSESSMENT.INCLUDED,
      comment: "",
    });
  }
  async function createCustomFactorAndAddToList(payload) {
    const response = await createCustomFactor(payload);
    if (response?.data?.ccCustomFactor)
      setCustomFactors((prevData) => [
        response?.data?.ccCustomFactor,
        ...prevData,
      ]);
  }
  async function createEmptyCustomFactorAndAddToList() {
    const response = await createCustomFactorWithEmptyData();
    if (response?.data?.ccCustomFactor)
      setCustomFactors((prevData) => [
        response?.data?.ccCustomFactor,
        ...prevData,
      ]);
  }
  // get locaion
  async function getCustomFactor(id) {
    try {
      const response = await ccCustomFactorService.getCustomFactor(id);
      handleSuccess(response);
      return response;
    } catch (err) {
      alert(err.message);
    }
  }
  // update locaion
  async function updateCustomFactor(id, payload) {
    try {
      const response = await ccCustomFactorService.updateCustomFactor(
        id,
        payload
      );
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function updateCustomFactorAndModifyInTheList(id, payload) {
    const response = await updateCustomFactor(id, payload);
    if (response?.data?.ccCustomFactor)
      setCustomFactors((prevData) =>
        prevData.map((l) => {
          return l._id === id ? response?.data?.ccCustomFactor : l;
        })
      );
  }
  // delete
  async function deleteCustomFactor(id) {
    try {
      const response = await ccCustomFactorService.deleteCustomFactor(id);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function deleteCustomFactorFromList(id) {
    const response = await deleteCustomFactor(id);
    if (response?.data?.ccCustomFactor)
      setCustomFactors((prevData) => prevData.filter((l) => l._id !== id));
  }
  useEffect(() => {
    /**
     * everytime a category changes we are set the query states back to normal
     */
    queryHandler.handleFilter({ value: { category } });
    queryHandler.handlePagination(1);
  }, [category]);
  useEffect(() => {
    listCustomFactors(queryHandler.getQueryString());
  }, [queryHandler.query]);
  return {
    pagination,
    queryHandler,
    viewingCustomFactor,
    customFactors,
    viewCustomFactor,
    createCustomFactor,
    createCustomFactorWithEmptyData,
    createCustomFactorAndAddToList,
    createEmptyCustomFactorAndAddToList,
    listCustomFactors,
    getCustomFactor,
    updateCustomFactor,
    updateCustomFactorAndModifyInTheList,
    deleteCustomFactor,
    deleteCustomFactorFromList,
  };
}
