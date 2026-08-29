import {
  useBuildQueryString,
  usePaginationState,
} from "@ims-systems-00/ims-react-hooks";
import moment from "moment";
import { useEffect, useState } from "react";
import CC_CONSTANTS from "../../../../constants";
import useAPIResponse from "../../../../hooks/apiResponse";
import * as ccReductionInitiatives from "../../../../services/ccReductionInitiatives";
import { useParameters } from "../../../../store/parametersStore";
import { INITIATIVE_STATUS } from "./constants";

export default function useStore({ status = INITIATIVE_STATUS.COMPLETE }) {
  const [viewingInitiative, setViewingInitiative] = useState(null);
  const [initiatives, setInitiatives] = useState([]);
  const { selectedReportingYear } = useParameters();
  const { handleError, handleSuccess } = useAPIResponse();
  const { pagination, updatePaginaion } = usePaginationState();
  let implementedFilter = {
    implementedAt: {
      gte: moment(selectedReportingYear?.startDate, "DD/MM/YYYY").toISOString(),
      lte: moment(selectedReportingYear?.endDate, "DD/MM/YYYY").toISOString(),
    },
  };
  let futureFilter = {
    identifiedAt: {
      gte: moment(selectedReportingYear?.startDate, "DD/MM/YYYY").toISOString(),
      lte: moment(selectedReportingYear?.endDate, "DD/MM/YYYY").toISOString(),
    },
  };
  const queryHandler = useBuildQueryString({
    required: {
      value:
        status === INITIATIVE_STATUS.COMPLETE
          ? { ...implementedFilter }
          : { ...futureFilter },
    },
  });
  async function listInitiatives(query = "") {
    try {
      const response = await ccReductionInitiatives.listInitiatives({
        query,
      });
      setInitiatives(response?.data?.ccCarbonReductionInitiatives);
      updatePaginaion(response?.data?.pagination);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function viewInitiatve(l) {
    setViewingInitiative(l);
    // we are silently updating the ui to improve ux
    let response = await getInitiative(l._id);
    if (response.data?.ccCarbonReductionInitiative)
      setViewingInitiative(response.data?.ccCarbonReductionInitiative);
  }
  async function createInitiative(payload) {
    try {
      const response = await ccReductionInitiatives.createInitiative(payload);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function createInitiativeWithEmptyData() {
    return createInitiative({
      locationRef: "",
      address: "",
      descriptionOfActivities: "",
      ghgAssessmentInclusion: CC_CONSTANTS.CC_GHG_INCLUSION_ASSESSMENT.INCLUDED,
      comment: "",
    });
  }
  async function createInitiativeAndAddToList(payload) {
    const response = await createInitiative(payload);
    if (response?.data?.ccCarbonReductionInitiative)
      setInitiatives((prevData) => [
        response?.data?.ccCarbonReductionInitiative,
        ...prevData,
      ]);
  }
  async function createEmptyInitiativeAndAddToList() {
    const response = await createInitiativeWithEmptyData();
    if (response?.data?.ccCarbonReductionInitiative)
      setInitiatives((prevData) => [
        response?.data?.ccCarbonReductionInitiative,
        ...prevData,
      ]);
  }
  // get locaion
  async function getInitiative(id) {
    try {
      const response = await ccReductionInitiatives.getInitiative(id);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  // update locaion
  async function updateInitiative(id, payload) {
    try {
      const response = await ccReductionInitiatives.updateInitiative(
        id,
        payload
      );
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function updateInitiativeAndModifyInTheList(id, payload) {
    const response = await updateInitiative(id, payload);
    if (response?.data?.ccCarbonReductionInitiative)
      setInitiatives((prevData) =>
        prevData.map((l) => {
          return l._id === id ? response?.data?.ccCarbonReductionInitiative : l;
        })
      );
  }
  // delete
  async function deleteInitiative(id) {
    try {
      const response = await ccReductionInitiatives.deleteInitiative(id);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function deleteInitiativeFromList(id) {
    const response = await deleteInitiative(id);
    if (response?.data?.ccCarbonReductionInitiative)
      setInitiatives((prevData) => prevData.filter((l) => l._id !== id));
  }
  useEffect(() => {
    /**
     * everytime a year changes we are set the query states back to normal
     */
    let filter = {};
    if (INITIATIVE_STATUS.COMPLETE === status)
      filter = { ...implementedFilter };
    if (INITIATIVE_STATUS.PLANNED === status) filter = { ...futureFilter };
    queryHandler.handleRequired({
      value: {
        ...filter,
      },
    });
    queryHandler.handlePagination(1);
  }, [selectedReportingYear, status]);
  useEffect(() => {
    if (selectedReportingYear?.startDate && selectedReportingYear?.endDate)
      listInitiatives(queryHandler.getQueryString());
  }, [queryHandler.query]);
  return {
    pagination,
    queryHandler,
    viewingInitiative,
    initiatives,
    viewInitiatve,
    createInitiative,
    createInitiativeWithEmptyData,
    createInitiativeAndAddToList,
    createEmptyInitiativeAndAddToList,
    listInitiatives,
    getInitiative,
    updateInitiative,
    updateInitiativeAndModifyInTheList,
    deleteInitiative,
    deleteInitiativeFromList,
  };
}
