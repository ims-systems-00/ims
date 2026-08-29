import React from "react";
import GetStarted from "./GetStarted";
import { GetStartedContextProvider } from "./store";

export default function () {
  return (
    <GetStartedContextProvider>
      <GetStarted />
    </GetStartedContextProvider>
  );
}
