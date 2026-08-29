import { useEffect, useState } from "react";
import * as ccCalculationService from "../../../../services/ccCalculationService";
import CC_CONSTANTS from "../../../../constants";
import { useCategory } from "../../stores/categoryStore";
import useAPIResponse from "../../../../hooks/apiResponse";
import {
  useBuildQueryString,
  usePaginationState,
} from "@ims-systems-00/ims-react-hooks";

export default function useStore({}) {
  const [viewingCategoryCalculation, setViewingCategoryCalculation] =
    useState(null);
  const [categoryCalculations, setCategoryCalculations] = useState([]);
  const { category } = useCategory();
  const { handleError, handleSuccess } = useAPIResponse();
  const { pagination, updatePaginaion } = usePaginationState();
  const queryHandler = useBuildQueryString({
    filter: {
      value: { category },
    },
  });
  async function listCategoryCalculations(query = "") {
    try {
      const response = await ccCalculationService.listCalculations({
        query,
      });
      setCategoryCalculations(response?.data?.ccCalculations);
      updatePaginaion(response?.data?.pagination);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function viewCategoryCalculation(l) {
    setViewingCategoryCalculation(l);
    // we are silently updating the ui to improve ux
    let response = await getCategoryCalculation(l._id);
    if (response.data?.ccCalculation)
      setViewingCategoryCalculation(response.data?.ccCalculation);
  }
  async function createCategoryCalculation(payload) {
    try {
      const response = await ccCalculationService.createCalculation(payload);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function createCategoryCalculationWithEmptyData() {
    return createCategoryCalculation({
      locationRef: "",
      address: "",
      descriptionOfActivities: "",
      ghgAssessmentInclusion: CC_CONSTANTS.CC_GHG_INCLUSION_ASSESSMENT.INCLUDED,
      comment: "",
    });
  }
  async function createCategoryCalculationAndAddToList(payload) {
    const response = await createCategoryCalculation(payload);
    if (response?.data?.ccCalculation)
      setCategoryCalculations((prevData) => [
        response?.data?.ccCalculation,
        ...prevData,
      ]);
  }
  async function createEmptyCategoryCalculationAndAddToList() {
    const response = await createCategoryCalculationWithEmptyData();
    if (response?.data?.ccCalculation)
      setCategoryCalculations((prevData) => [
        response?.data?.ccCalculation,
        ...prevData,
      ]);
  }
  // get locaion
  async function getCategoryCalculation(id) {
    try {
      const response = await ccCalculationService.getCalculation(id);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  // update locaion
  async function updateCategoryCalculation(id, payload) {
    try {
      const response = await ccCalculationService.updateCalculation(
        id,
        payload
      );
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function updateCategoryCalculationAndModifyInTheList(id, payload) {
    const response = await updateCategoryCalculation(id, payload);
    if (response?.data?.ccCalculation)
      setCategoryCalculations((prevData) =>
        prevData.map((l) => {
          return l._id === id ? response?.data?.ccCalculation : l;
        })
      );
  }
  // delete
  async function deleteCategoryCalculation(id) {
    try {
      const response = await ccCalculationService.deleteCalculation(id);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function deleteCategoryCalculationFromList(id) {
    const response = await deleteCategoryCalculation(id);
    if (response?.data?.ccCalculation)
      setCategoryCalculations((prevData) =>
        prevData.filter((l) => l._id !== id)
      );
  }
  useEffect(() => {
    /**
     * everytime a category changes we are set the query states back to normal
     */
    queryHandler.handleFilter({ value: { category } });
    queryHandler.handlePagination(1);
  }, [category]);
  useEffect(() => {
    listCategoryCalculations(queryHandler.getQueryString());
  }, [queryHandler.query]);
  return {
    pagination,
    queryHandler,
    viewingCategoryCalculation,
    categoryCalculations,
    viewCategoryCalculation,
    createCategoryCalculation,
    createCategoryCalculationWithEmptyData,
    createCategoryCalculationAndAddToList,
    createEmptyCategoryCalculationAndAddToList,
    listCategoryCalculations,
    getCategoryCalculation,
    updateCategoryCalculation,
    updateCategoryCalculationAndModifyInTheList,
    deleteCategoryCalculation,
    deleteCategoryCalculationFromList,
  };
}
