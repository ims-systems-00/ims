import useAPIError from "./useAPIError";
import useAPISuccess from "./useAPISuccess";
export default function useAPIResponse() {
  const errorHandlers = useAPIError();
  const successHandlers = useAPISuccess();
  return {
    ...errorHandlers,
    ...successHandlers,
  };
}
