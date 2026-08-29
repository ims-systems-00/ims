import React, { useState, useEffect } from "react";
import {
  usePaginationState,
  useBuildQueryString,
} from "@ims-systems-00/ims-react-hooks";
import useAPIResponse from "../../../../hooks/apiResponse";
import * as activityService from "../../../../services/activityService";

export default function useStore({ module = null, moduleType = null }) {
  const [viewingActivity, setViewingActivity] = useState(null);
  const [activities, setActivities] = useState([]);
  const { handleError, handleSuccess } = useAPIResponse();
  const { pagination, updatePaginaion } = usePaginationState();
  const queryHandler = useBuildQueryString({
    filter: {
      value: { module, moduleType },
    },
  });
  async function listActivities(query = "") {
    try {
      const response = await activityService.lisActivities({
        query,
      });
      updatePaginaion(response?.data?.pagination);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function listAndMuteExitingActivities(query = "") {
    const response = await listActivities(query);
    if (response?.data?.activities) setActivities(response?.data?.activities);
  }
  async function listAndAppendToExitingActivities(query = "") {
    const response = await listActivities(query);
    if (response?.data?.activities)
      setActivities((prevData) => [...prevData, ...response?.data?.activities]);
  }
  async function viewActivity(l) {
    setViewingActivity(l);
    // we are silently updating the ui to improve ux
    let response = await getActivity(l._id);
    if (response.data?.activity) setViewingActivity(response.data?.activity);
  }
  async function createActivity(payload) {
    try {
      const response = await activityService.createActivity({
        module,
        moduleType,
        ...payload,
      });
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function createActivityAndAddToList(payload) {
    const response = await createActivity(payload);
    if (response?.data?.activity)
      setActivities((prevData) => [response?.data?.activity, ...prevData]);
  }

  // get locaion
  async function getActivity(id) {
    try {
      const response = await activityService.getActivity(id);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  // update locaion
  async function updateActivity(id, payload) {
    try {
      const response = await activityService.updateActivity(id, payload);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function updateActivityAndModifyInTheList(id, payload) {
    const response = await updateActivity(id, payload);
    if (response?.data?.activity)
      setActivities((prevData) =>
        prevData.map((l) => {
          return l._id === id ? response?.data?.activity : l;
        })
      );
  }
  // delete
  async function deleteActivity(id) {
    try {
      const response = await activityService.deleteActivity(id);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function deleteActivityFromList(id) {
    const response = await deleteActivity(id);
    if (response?.data?.activity)
      setActivities((prevData) => prevData.filter((l) => l._id !== id));
  }

  function applyDefaultFilterInTheList() {
    queryHandler.handleFilter({ value: { module, moduleType } });
    queryHandler.handlePagination(1);
  }
  function applyCommentsOnlyFilterInTheList() {
    queryHandler.handleFilter({
      value: { module, moduleType, isAutomated: false },
    });
    queryHandler.handlePagination(1);
  }
  function applyAutomatedActivitiesOnlyFilterInTheList() {
    queryHandler.handleFilter({
      value: { module, moduleType, isAutomated: true },
    });
    queryHandler.handlePagination(1);
  }
  function hasMoreActivities() {
    return pagination.hasNextPage;
  }
  function loadNextPage() {
    if (hasMoreActivities()) queryHandler.handlePagination(pagination.nextPage);
  }
  useEffect(() => {
    /**
     * everytime a category changes we are set the query states back to normal
     */
    applyDefaultFilterInTheList();
  }, [module, moduleType]);
  useEffect(() => {
    // if it we are loading first page we have to mute existing list
    if (queryHandler.toolState.pagination?.page === 1)
      listAndMuteExitingActivities(queryHandler.getQueryString());
    else listAndAppendToExitingActivities(queryHandler.getQueryString());
  }, [queryHandler.query]);
  return {
    pagination,
    queryHandler,
    viewingActivity,
    activities,
    viewActivity,
    createActivity,
    createActivityAndAddToList,
    listActivities,
    getActivity,
    updateActivity,
    updateActivityAndModifyInTheList,
    deleteActivity,
    deleteActivityFromList,
    applyDefaultFilterInTheList,
    applyCommentsOnlyFilterInTheList,
    applyAutomatedActivitiesOnlyFilterInTheList,
    hasMoreActivities,
    loadNextPage,
  };
}
