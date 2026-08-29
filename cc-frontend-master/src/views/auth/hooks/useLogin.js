import { useNavigate } from "react-router-dom";
import { login } from "../../../services/authService";
import useAPIResponse from "../../../hooks/apiResponse";
import { useApplication } from "../../../store/applicationStore";

export const useLogin = () => {
  const navigate = useNavigate();
  const { updateTokenPair } = useApplication();
  const { handleError, handleSuccess } = useAPIResponse();

  const handleLogin = async (formData) => {
    try {
      const response = await login(formData);
      await updateTokenPair({
        accessToken: response?.data?.accessToken,
        refreshToken: response?.data?.refreshToken,
      });

      handleSuccess(response);
      navigate("/preparation-screen");
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  return {
    handleLogin,
  };
};
