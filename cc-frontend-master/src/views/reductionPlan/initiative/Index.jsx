import React from "react";
import {
  INITIATIVE_STATUS,
  InitiativesContextProvider,
} from "./store/index.js";
import Initiatives from "./Initiatives.jsx";
import { useInitiativeConfig } from "../store";

export * from "./store";

export default function ({ status = INITIATIVE_STATUS.COMPLETE }) {
  const { year } = useInitiativeConfig({ status });
  return (
    <InitiativesContextProvider status={status}>
      <Initiatives />
    </InitiativesContextProvider>
  );
}
