import { useCallback, useEffect, useState } from "react";
import * as ccParameterService from "../../../../services/ccParameterService";
export default function useStore() {
  const [parameter, setParameter] = useState(null);
  const [isParameterLoading, setIsParameterLoading] = useState(true); // defaults to true
  const loadParameter = useCallback(async function () {
    try {
      setIsParameterLoading(true);
      let { data } = await ccParameterService.listParameters();
      setParameter(data.ccParameters[0] || null);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsParameterLoading(false);
    }
  }, []);
  useEffect(() => {
    loadParameter();
  }, []);
  return {
    parameter,
    isParameterLoading,
    loadParameter,
  };
}
