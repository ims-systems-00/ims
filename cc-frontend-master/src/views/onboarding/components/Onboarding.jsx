import { Container, Row } from "@ims-systems-00/ims-ui-kit";
import React from "react";

function Onboarding({ children }) {
  return (
    <Container className="h-100">
      <Row className="h-100">{children}</Row>
    </Container>
  );
}

export default Onboarding;
