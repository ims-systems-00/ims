import { useEffect, useState } from "react";
import * as ccLocationService from "../../../../services/ccLocationService";
import CC_CONSTANTS from "../../../../constants";
import useAPIResponse from "../../../../hooks/apiResponse";
import {
  useBuildQueryString,
  usePaginationState,
} from "@ims-systems-00/ims-react-hooks";
export default function useStore() {
  const [viewingLocation, setViewingLocation] = useState(null);
  const [locations, setLocations] = useState([]);
  const { handleError, handleSuccess } = useAPIResponse();
  const { pagination, updatePaginaion } = usePaginationState();
  const queryHandler = useBuildQueryString();
  async function listLocations(query) {
    try {
      const response = await ccLocationService.listLocations({ query });
      updatePaginaion(response?.data?.pagination);
      setLocations(response?.data?.ccLocations);
    } catch (err) {
      handleError(err);
    }
  }
  function viewLocation(l) {
    setViewingLocation(l);
  }
  async function createLocation(payload) {
    try {
      let response = await ccLocationService.createLocation(payload);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function createLocationWithEmptyData() {
    return createLocation({
      locationRef: "",
      address: "",
      descriptionOfActivities: "",
      ghgAssessmentInclusion: CC_CONSTANTS.CC_GHG_INCLUSION_ASSESSMENT.INCLUDED,
      comment: "",
    });
  }
  async function createLocationAndAddToList(payload) {
    let response = await createLocation(payload);
    if (response?.data?.ccLocation)
      setLocations((locs) => [response?.data?.ccLocation, ...locs]);
  }
  async function createEmptyLocaionAndAddToList() {
    let response = await createLocationWithEmptyData();
    if (response?.data?.ccLocation)
      setLocations((locs) => [response?.data?.ccLocation, ...locs]);
  }
  // get locaion
  async function getLocation(id) {
    try {
      let response = await ccLocationService.getLocation(id);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  // update locaion
  async function updateLocation(id, payload) {
    try {
      let response = await ccLocationService.updateLocation(id, payload);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function updateLocationAndModifyInTheList(id, payload) {
    let response = await updateLocation(id, payload);
    if (response?.data?.ccLocation)
      setLocations((locs) =>
        locs.map((l) => {
          return l._id === id ? response?.data?.ccLocation : l;
        })
      );
  }
  // delete
  async function deleteLocation(id) {
    try {
      let response = await ccLocationService.deleteLocation(id);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function deleteLocationFromList(id) {
    let response = await deleteLocation(id);
    if (response?.data?.ccLocation)
      setLocations((locs) => locs.filter((l) => l._id !== id));
  }
  useEffect(() => {
    listLocations(queryHandler.getQueryString());
  }, [queryHandler.query]);
  return {
    pagination,
    queryHandler,
    viewingLocation,
    locations,
    viewLocation,
    createLocation,
    createLocationWithEmptyData,
    createLocationAndAddToList,
    createEmptyLocaionAndAddToList,
    listLocations,
    getLocation,
    updateLocation,
    updateLocationAndModifyInTheList,
    deleteLocation,
    deleteLocationFromList,
  };
}
