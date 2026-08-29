import { useEffect } from "react";
import http from "../../services/httpService";
import useAccessControl from "./hooks/useAccessControl";
import useImsFreezLoading from "./hooks/useImsFreezLoading";
import useGoogle from "./hooks/useGoogle";

/**
 * this current refresh function is a very important function that tracks and only references a
 * single refresh function for all concurrent request to avoid reuse of same refresht token.
 */
let currentRefreshFunction = undefined;
export default function useStore(config) {
  let googleProps = useGoogle();
  const {
    initialLoadComplete,
    tokenPair,
    refreshToken,
    isLoggedIn,
    refreshCache,
    membershipData,
    updateTokenPair: _updateTokenPair,
    currentUserData,
    isUserVerified,
    getTrialDays,
    switchIntoOrganisation,
    switchIntoGroup,
    refreshMembershipData,
  } = useAccessControl();
  const imsFreezLoadingUrils = useImsFreezLoading();
  function updateTokenPair(tokenPair) {
    http.setUserAccessWithJWT(tokenPair?.accessToken);
    _updateTokenPair(tokenPair);
  }
  useEffect(() => {
    refreshCache();
  }, []);
  useEffect(() => {
    let requestInterceptor = http.instance.interceptors.request.use(
      async (config) => config,
      (error) => {
        const expectedError =
          error.response &&
          error.response.status >= 400 &&
          error.response.status < 500;
        if (!expectedError) {
        }
        return Promise.reject(error);
      }
    );
    let responseInterceptor = http.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        const expectedError =
          error.response &&
          error.response.status >= 400 &&
          error.response.status < 500;
        const needRefresh =
          expectedError &&
          error.response.status === 401 &&
          error.response.data?.message === "Invalid access token." &&
          !originalRequest._retry;
        if (needRefresh) {
          /** set the refresh function of not set */
          if (!currentRefreshFunction) currentRefreshFunction = refreshToken();
          let newTokenPair = await currentRefreshFunction;
          originalRequest.headers["x-auth-accesstoken"] =
            newTokenPair.accessToken;
          /** reset the refresh function so in future it can again detect reuse  */
          currentRefreshFunction = undefined;
          return http.instance(originalRequest);
        }
        if (
          expectedError &&
          error.response.data &&
          error.response.status === 440
        ) {
          window.location = "/auth/logout";
        }
        if (
          expectedError &&
          error.response.data &&
          error.response.data.message === "User unauthorized or login expired"
        ) {
          window.location = "/auth/logout";
        }
        if (
          expectedError &&
          error.response.data &&
          error.response.data.statusCode === 419 /** session expired */
        ) {
          localStorage.clear();
          alert(
            "Your current action requires you to login again. Your current session expired"
          );
          window.location = "/auth/logout";
        }
        return Promise.reject(error);
      }
    );
    return () => {
      http.instance.interceptors.request.eject(requestInterceptor);
      http.instance.interceptors.response.eject(responseInterceptor);
    };
  }, []);
  return {
    tokenPair,
    isApplicationReady: initialLoadComplete,
    refreshToken,
    isLoggedIn,
    currentUserData,
    isUserVerified,
    getTrialDays,
    refreshCache,
    updateTokenPair,
    switchIntoOrganisation,
    switchIntoGroup,
    membershipData,
    refreshMembershipData,
    ...imsFreezLoadingUrils,
    googleProps,
  };
}
