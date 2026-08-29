import { useApplication } from "../store/applicationStore";
import { Navigate } from "react-router-dom";

function LoginWithOrgProtected({ children }) {
  const { isLoggedIn } = useApplication();
  if (!isLoggedIn()) return <Navigate to={"/logout"} />;
  return children;
}

export default LoginWithOrgProtected;
