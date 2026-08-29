import { useCallback, useEffect, useState } from "react";
import * as organisationService from "../../services/organisationService";
import useAPIResponse from "../../hooks/apiResponse";
import { useApplication } from "../applicationStore";

export default function useStore() {
  const { tokenPair } = useApplication();
  const [organisation, setOrganisation] = useState(null);
  const [isOrganisationLoading, setIsOrganisationLoading] = useState(true); // defaults to true
  const { handleError, handleSuccess } = useAPIResponse();
  const loadOrganisation = useCallback(async function () {
    try {
      setIsOrganisationLoading(true);
      let response = await organisationService.getOrganization(
        tokenPair?.accessTokenData?.user?.organizationId
      );
      setOrganisation(response?.data?.organization || null);
    } catch (err) {
      handleError(err);
    } finally {
      setIsOrganisationLoading(false);
    }
  }, []);
  async function updateOrganisation(id, payload) {
    try {
      let response = await organisationService.updateOrganisation(id, payload);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function updateOrganisationAndMuteState(...args) {
    let response = await updateOrganisation(...args);
    if (response?.data?.organization) {
      setOrganisation(response?.data?.organization);
    }
  }
  function authBetaVersion() {
    return organisation?.licenses?.carbocalc || organisation?.licenses?.go2ero;
  }
  useEffect(() => {
    loadOrganisation();
  }, []);
  return {
    organisation,
    isOrganisationLoading,
    loadOrganisation,
    updateOrganisationAndMuteState,
    authBetaVersion,
  };
}
