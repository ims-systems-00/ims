import { useCallback, useEffect, useState } from "react";
import * as ccParameterService from "../../../services/ccParameterService";
import { useSearchParams } from "react-router-dom";
import CC_CONSTANTS from "../../../constants";
export default function useStore() {
  const [params] = useSearchParams();
  const [category, setCategory] = useState(null);
  const [scope, setScope] = useState(null);
  const [scopeName, setScopeName] = useState(null);
  useEffect(() => {
    if (params.get("category")) {
      let category = params.get("category") || null;
      setCategory(category);
      let scope = null;
      let scopeName = null;
      if (
        Object.values(CC_CONSTANTS.CC_EMISSION_SCOPE_1_CATEGORY_NAMES).includes(
          category
        )
      ) {
        scope = CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_1;
        scopeName = CC_CONSTANTS.CC_EMISSION_SCOPE_NAMES.SCOPE_1_NAME;
      }
      if (
        Object.values(CC_CONSTANTS.CC_EMISSION_SCOPE_2_CATEGORY_NAMES).includes(
          category
        )
      ) {
        scope = CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_2;
        scopeName = CC_CONSTANTS.CC_EMISSION_SCOPE_NAMES.SCOPE_2_NAME;
      }
      if (
        Object.values(CC_CONSTANTS.CC_EMISSION_SCOPE_3_CATEGORY_NAMES).includes(
          category
        )
      ) {
        scope = CC_CONSTANTS.CC_EMISSION_SCOPES.SCOPE_3;
        scopeName = CC_CONSTANTS.CC_EMISSION_SCOPE_NAMES.SCOPE_3_NAME;
      }
      setScope(scope);
      setScopeName(scopeName);
    }
  }, [params]);
  return {
    category,
    scope,
    scopeName,
  };
}
