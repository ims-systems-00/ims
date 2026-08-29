import useAPIResponse from "../../../hooks/apiResponse";
import { authorize } from "../../../services/authService";

export default function useAuthFlow() {
  const { handleError } = useAPIResponse();
  async function attemptLogin() {
    try {
      let response = await authorize({
        redirect_uri: window.location.origin + "/auth-token",
      });
      window.location.replace(response?.data?.authUrl);
    } catch (err) {
      handleError(err);
    }
  }
  return {
    attemptLogin,
  };
}
