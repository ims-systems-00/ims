import { useEffect } from "react";
import useAPIResponse from "../../../hooks/apiResponse";
export default function useStore({}) {
  const { handleSuccess, handleError } = useAPIResponse();
  useEffect(() => {}, []);
  return {};
}
