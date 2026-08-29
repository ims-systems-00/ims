import React from "react";
import LeftContainer from "../components/LeftContainer";
import Onboarding from "../components/Onboarding";
import RightContainer from "../components/RightContainer";

function Welcome() {
  return (
    <Onboarding>
      <LeftContainer>Test</LeftContainer>
      <RightContainer>Test</RightContainer>
    </Onboarding>
  );
}

export default Welcome;
