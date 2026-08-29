import React from "react";
import Container from "./Container";
import { ActivityContextProvider } from "./store";
function ActivityTimeLine({ module = null, moduleType = null }) {
  return (
    <ActivityContextProvider moduleType={moduleType} module={module}>
      <Container />
    </ActivityContextProvider>
  );
}

export default ActivityTimeLine;