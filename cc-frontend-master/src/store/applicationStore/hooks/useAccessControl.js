import jwtDecode from "jwt-decode";
import { useEffect, useState } from "react";
import * as authService from "../../../services/authService";
import * as userService from "../../../services/userService";
import httpService from "../../../services/httpService";
import { useProcessing } from "@ims-systems-00/ims-react-hooks";
// import {
//   getMembership,
//   getMembershipFromCache,
//   refreshMembershipCache,
// } from "../../../services/membershipService";
import { useNavigate } from "react-router-dom";
const SYSTEM_ACTIONS = {
  REFRESH_TOKEN: "refrsh-token",
};
/**
 * this hook not recomended to use outside of this store in anny component directly.
 * the store exposes utility function based on this hook to maintain ui logics.
 */
const processTokePairBeforeSave = (accessToken, refreshToken) => {
  let accessTokenData = jwtDecode(accessToken);
  let refreshTokenData = jwtDecode(refreshToken);
  return {
    accessToken,
    refreshToken,
    accessTokenData,
    refreshTokenData,
  };
};
export default function useAccessControl() {
  const [currentUserData, setCurrentUserData] = useState(null);
  const [membershipData, setMembershipData] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [tokenPair, setTokenPair] = useState(null);
  const navigate = useNavigate();
  const { processing, dispatch: _dispatch } = useProcessing(
    Object.keys(SYSTEM_ACTIONS).map((action) => {
      return { action: SYSTEM_ACTIONS[action] };
    })
  );
  function isLoggedIn() {
    if (tokenPair?.accessToken && tokenPair?.refreshToken) return true;
    return false;
  }
  /** following function initates user from cache at first load. */
  function _setCurrentUserData() {
    if (userService.getUserProfileFromCache()) {
      setCurrentUserData(userService.getUserProfileFromCache());
    }
    // if (getMembershipFromCache()) {
    //   setMembershipData(getMembershipFromCache());
    // }
  }
  function isUserVerified() {
    let _user = currentUserData || userService.getUserProfileFromCache();
    if (_user?.emailVerified?.status === "varified") return true;
    return false;
  }
  function getTrialDays(trailAllowed = 2) {
    let _user = currentUserData || userService.getUserProfileFromCache();
    const today = new Date();
    const end = new Date(_user?.createdAt);
    end.setDate(end.getDate() + trailAllowed);
    const diffInMs = end - today;
    const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }
  function updateTokenPair(tokenPair) {
    setTokenPair(
      processTokePairBeforeSave(tokenPair.accessToken, tokenPair.refreshToken)
    );
  }
  function getCurrentSessionData() {
    if (!tokenPair?.accessToken) return null;
    try {
      let data = jwtDecode(tokenPair?.accessToken);
      return data;
    } catch (ex) {
      return null;
    }
  }
  /**
   * this follwoing function sets the access tokens at the point when the full application
   * mounts. How this works:
   * Following function gets invoked. If the browser contains a valid refreshtoken cookie
   * it tries to refresh the token with an api request. in case of failiure we gracefully
   * logout the user or do all cleanups.
   *
   */
  async function refreshToken() {
    if (!userService.getUserProfileFromCache()) {
      if (!initialLoadComplete) setInitialLoadComplete(true);
      return;
    }
    try {
      _dispatch({
        [SYSTEM_ACTIONS.REFRESH_TOKEN]: {
          status: true,
          error: false,
          id: null,
        },
      });

      const currentOrgId =
        httpService.instance.defaults.headers.common["x-org-id"];

      let { data } = await authService.refreshToken();
      setTokenPair(
        processTokePairBeforeSave(data.accessToken, data.refreshToken)
      );
      httpService.setUserAccessWithJWT(data?.accessToken);

      if (currentOrgId) {
        httpService.setOrganisationAccess(currentOrgId);
      }

      _dispatch({
        [SYSTEM_ACTIONS.REFRESH_TOKEN]: {
          status: false,
          error: false,
          id: null,
        },
      });

      if (!initialLoadComplete) setInitialLoadComplete(true);
      return processTokePairBeforeSave(data.accessToken, data.refreshToken);
    } catch (err) {
      if (!initialLoadComplete) setInitialLoadComplete(true);
      navigate("/logout");
      _dispatch({
        [SYSTEM_ACTIONS.REFRESH_TOKEN]: {
          status: false,
          error: true,
          id: null,
        },
      });
      throw err;
    }
  }
  async function switchIntoOrganisation(id) {
    if (!id) {
      console.error("switchIntoOrganisation called with invalid ID:", id);
      throw new Error(
        "Organization ID is required and cannot be null or undefined"
      );
    }

    if (typeof id !== "string" || id.trim() === "") {
      console.error(
        "switchIntoOrganisation called with invalid ID type:",
        typeof id,
        id
      );
      throw new Error("Organization ID must be a non-empty string");
    }

    try {
      httpService.setOrganisationAccess(id);

      await _cacheUserData();

      const newTokenData = await refreshToken();

      await refreshMembershipData(
        newTokenData?.accessTokenData?.user?.membershipId
      );

      return newTokenData;
    } catch (error) {
      console.error("Error switching organization:", error);
      throw error;
    }
  }
  async function switchIntoGroup(id) {
    if (!id) throw new Error("Bu id is needed");
    httpService.setBusinessUnitAccess(id);

    // Ensure user profile is cached before calling refreshToken
    await _cacheUserData();

    const newTokenData = await refreshToken();
    await refreshMembershipData(
      newTokenData?.accessTokenData.user?.membershipId
    );
  }
  async function _cacheUserData() {
    if (tokenPair?.accessTokenData?.user?._id)
      try {
        let [profileRes] = await Promise.all([
          userService.getUserWithBasicInfo(
            tokenPair?.accessTokenData?.user?._id
          ),
        ]);
        userService.refreshProfileCache(profileRes.data.user);
        setCurrentUserData(profileRes.data.user);
        return profileRes.data.user;
      } catch (err) {
        console.log(err);
      }
  }
  async function refreshMembershipData(id) {
    // if (tokenPair?.accessTokenData?.user?._id)
    //   try {
    //     let { data } = await getMembership(id);
    //     refreshMembershipCache(data.membership);
    //     setMembershipData(data.membership);
    //     return data.membership;
    //   } catch (err) {
    //     imsLogger(err);
    //   }
  }
  function refreshCache() {
    return _cacheUserData();
  }
  useEffect(() => {
    (async function () {
      await refreshToken();
      _setCurrentUserData();
    })();
  }, []);
  return {
    initialLoadComplete,
    tokenPair,
    refreshInProgress: processing[SYSTEM_ACTIONS.REFRESH_TOKEN].status,
    isLoggedIn,
    getCurrentSessionData,
    updateTokenPair,
    currentUserData,
    membershipData,
    isUserVerified,
    getTrialDays,
    refreshToken,
    refreshCache,
    switchIntoOrganisation,
    switchIntoGroup,
    refreshMembershipData,
  };
}
