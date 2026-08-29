import { useCallback, useEffect, useState } from "react";
import useAPIResponse from "../../hooks/apiResponse";
import * as ccParameterService from "../../services/ccParameterService";
export default function useReportingBoundaries({ parameterId = null }) {
  const [reportingBoundaries, setReportingBoundaries] = useState([]);
  const [_parameterId, setParameterId] = useState(parameterId);
  const { handleError, handleSuccess } = useAPIResponse();
  const listReportingBoundaries = useCallback(async function (id) {
    try {
      let response = await ccParameterService.listReportingBoundaries(id);
      setReportingBoundaries(response.data.ccParameterReportingBoundaries);
    } catch (err) {
      handleError(err);
    }
  }, []);
  const loadParameter = useCallback(async function () {
    try {
      let response = await ccParameterService.listParameters();
      if (response.data.ccParameters[0])
        setParameterId(response.data.ccParameters[0]._id);
    } catch (err) {
      handleError(err);
    }
  }, []);
  useEffect(() => {
    /**
     * we are checking if 'parameterId is passed from the parent.  If default parameterId is given no need to load the parameter.
     * otherwise we do an API hit to load the parameter to use it for this component.
     */
    if (parameterId) return setParameterId(parameterId);
    loadParameter();
  }, []);
  useEffect(() => {
    /** we are loading the boundaries as soon as we get the internal parameter id -> _parameterId*/
    if (_parameterId) listReportingBoundaries(_parameterId);
  }, [_parameterId]);
  async function updateReportingBoundary(id, payload) {
    try {
      let response = await ccParameterService.updateReportingBoundary(
        _parameterId,
        id,
        payload
      );
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function updateReportingBoundaryAndModifyInTheList(id, payload) {
    let response = await updateReportingBoundary(id, payload);
    if (response?.data?.ccParameterReportingBoundary)
      setReportingBoundaries((bdry) =>
        bdry.map((b) => {
          return b._id === id
            ? response?.data?.ccParameterReportingBoundary
            : b;
        })
      );
  }
  function getRelevanceForCategory(categoryName) {
    return (
      reportingBoundaries.find((boundary) => boundary.category === categoryName)
        ?.relevance || ""
    );
  }
  return {
    parameterId: _parameterId,
    reportingBoundaries,
    updateReportingBoundary,
    updateReportingBoundaryAndModifyInTheList,
    getRelevanceForCategory,
  };
}
