import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAPIResponse from "../../../hooks/apiResponse";
import { listMemberships } from "../../../services/membershipService";
import { useApplication } from "../../../store/applicationStore";

export const usePreparationScreen = () => {
  const navigate = useNavigate();
  const { isLoggedIn, tokenPair } = useApplication();
  const { handleError } = useAPIResponse();

  useEffect(() => {
    let isMounted = true;

    async function prepare() {
      try {
        if (!isLoggedIn()) {
          console.log("User not logged in, redirecting to login");
          if (isMounted) {
            navigate("/login");
          }
          return;
        }

        const membershipsPromise = listMemberships();
        const membershipRes = await membershipsPromise;

        if (isMounted) {
          if (membershipRes?.data?.details?.memberships?.length) {
            navigate("/organisation-selection");
          } else {
            navigate("/logout");
          }
        }
      } catch (err) {
        console.log("err", err);
        if (isMounted) {
          handleError(err);
          navigate("/logout");
        }
      }
    }

    prepare();

    return () => {
      isMounted = false;
    };
  }, [navigate, isLoggedIn, tokenPair, handleError]);
  return {};
};
